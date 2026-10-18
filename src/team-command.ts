import ora from 'ora';
import fs from 'fs-extra';
import inquirer from 'inquirer';

import Command, { IAccountTeam, IConfig } from './base.js';
import ITeam, {
  ITeamAssignedPermission,
  ITeamInvitation,
  ITeamMember,
  ITeamPermission,
  ITeamPermissionRef,
  ITeamRole,
} from './types/team.js';
import {
  GLOBAL_CONF_PATH,
  GLOBAL_CONF_VERSION,
  TEAM_RESOURCE_NAME_FIELDS,
} from './constants.js';

const PAGE_SIZE = 100;

const TEAM_ERRORS: { [code: string]: string } = {
  account_verification_required: 'Please verify your account first.',
  already_joined: 'You have already joined this team.',
  bucket_not_found: 'Could not find the bucket.',
  cannot_assign_permission_to_team_creator:
    "You can't assign permissions to the team owner.",
  cannot_delete_team_with_usage_in_current_month:
    "The team can't be deleted because this month's usage hasn't been invoiced yet. Please wait until the invoice is issued next month.",
  cannot_leave_team_as_creator: "You can't leave a team you created.",
  cannot_revoke_permission_from_team_creator:
    "You can't revoke permissions from the team owner.",
  custom_role_already_exists: 'This role already exists.',
  custom_role_not_found: 'Could not find the role.',
  database_not_found: 'Could not find the database.',
  invalid_invitation_token:
    'The invitation is not valid. The invited email must be the same as your account email, and invitation links are valid for 3 days only.',
  invitation_already_exists: 'This user has already been invited.',
  invitation_not_found: 'Could not find the invitation.',
  mail_server_not_found: 'Could not find the mail server.',
  max_custom_roles_reached:
    'The team has reached the maximum number of custom roles.',
  max_permissions_reached:
    'You have reached the maximum number of assigned permissions.',
  max_team_members_reached:
    'The team has reached the maximum number of members.',
  max_teams_reached: 'You have reached the maximum number of teams.',
  member_not_found: 'Could not find the team member.',
  no_permission: "You don't have the required permission in the current team.",
  permission_already_exists: 'This permission has already been assigned.',
  permission_not_found: 'Could not find the permission.',
  positive_balance:
    "The team can't be deleted because it has credit. Please open a ticket to get a refund first.",
  project_not_found: 'Could not find the app.',
  role_in_use: "This role is in use and can't be deleted.",
  role_not_found: 'Could not find the role.',
  target_member_role_should_be_the_same_as_yours:
    'The selected member must have the same role as you.',
  team_already_exists: 'You have already created a team with this name.',
  team_not_found: 'Could not find the team.',
  zone_not_found: 'Could not find the zone.',
};

export const memberLabel = ({ user }: { user: ITeamMember['user'] }) =>
  `${user.fullname} <${user.email}>`;

export const permissionLabel = ({ type, name }: ITeamPermissionRef) =>
  `${type}:${name}`;

export const resourceLabel = (grant: ITeamAssignedPermission) => {
  const resource = grant[grant.type];
  return resource?.[TEAM_RESOURCE_NAME_FIELDS[grant.type]] || resource?._id;
};

export const requireInput = (input: string) =>
  input.trim().length > 0 || 'This field is required.';

const parseErrorBody = (
  body: unknown,
): { code?: string; data?: { code?: string }; message?: string } => {
  try {
    return (typeof body === 'string' ? JSON.parse(body) : body) || {};
  } catch {
    return {};
  }
};

export default abstract class TeamCommand extends Command {
  team!: ITeam;

  async catch(error: any) {
    if (error.response && error.response.statusCode !== 401) {
      const { code, data, message } = parseErrorBody(error.response.body);
      const errorCode = data?.code ?? code;
      const errorMessage = (errorCode && TEAM_ERRORS[errorCode]) || message;

      if (errorMessage) {
        this.error(errorMessage);
      }
    }

    return super.catch(error);
  }

  async setupTeam(config: IConfig): Promise<ITeam> {
    await this.setGotConfig(config);

    const teams = await this.getTeams();
    const teamId = config['team-id'] || (await this.promptTeam(teams));
    const team = teams.find((team) => team._id === teamId);

    if (!team) {
      this.error(`You don't have a team with ID '${teamId}'.
Please select another team via 'liara team:use'.`);
    }

    // Requests for the team's resources (e.g. its apps) run in team mode.
    config['team-id'] = team._id;
    this.team = team;
    return team;
  }

  teamPath(path = '') {
    return `v2/teams/${this.team._id}${path}`;
  }

  // Fetches every page of a paginated team route.
  async getAll<T>(path: string, key: string): Promise<T[]> {
    const totalKey = `total${key[0].toUpperCase()}${key.slice(1)}`;
    const items: T[] = [];
    let total = Number.POSITIVE_INFINITY;

    this.spinner = ora();
    this.spinner.start('Loading...');

    try {
      for (let page = 1; items.length < total; page++) {
        const body = await this.got(path, {
          searchParams: { page, count: PAGE_SIZE },
        }).json<{ [key: string]: any }>();

        const pageItems: T[] = body[key];
        items.push(...pageItems);
        total = pageItems.length > 0 ? body[totalKey] : items.length;
      }

      return items;
    } finally {
      this.spinner.stop();
    }
  }

  getTeams() {
    return this.getAll<ITeam>('v2/teams', 'teams');
  }

  getMembers() {
    return this.getAll<ITeamMember>(this.teamPath('/members'), 'members');
  }

  getRoles() {
    return this.getAll<ITeamRole>(this.teamPath('/roles'), 'roles');
  }

  getInvitations() {
    return this.getAll<ITeamInvitation>(
      this.teamPath('/invitations'),
      'invitations',
    );
  }

  getAssignedPermissions() {
    return this.getAll<ITeamAssignedPermission>(
      this.teamPath('/assigned-permissions'),
      'assignedPermissions',
    );
  }

  getPermissionCatalog() {
    return this.getAll<ITeamPermission>('v2/teams/permissions', 'permissions');
  }

  async promptTeam(
    teams: ITeam[],
    options: { personal?: boolean; current?: string } = {},
  ): Promise<string> {
    if (teams.length === 0 && !options.personal) {
      this.error(
        "You don't belong to any team. Create one via 'liara team:create'.",
      );
    }

    return this.promptList(
      'Please select a team:',
      [
        ...(options.personal ? [{ name: 'Personal account', value: '' }] : []),
        ...teams.map((team) => ({
          // The ID only tells apart teams with the same name.
          name:
            teams.filter(({ name }) => name === team.name).length > 1
              ? `${team.name} (${team._id})`
              : team.name,
          value: team._id,
        })),
      ],
      options.current,
    );
  }

  // Finds a member by ID or email, or prompts for one.
  async resolveMember(value?: string): Promise<ITeamMember> {
    const members = await this.getMembers();

    if (!value) {
      const memberId = await this.promptList(
        'Please select a member:',
        members.map((member) => ({
          name: `${memberLabel(member)} - ${member.role.name}`,
          value: member._id,
        })),
      );
      return members.find((member) => member._id === memberId)!;
    }

    const member = members.find(
      (member) =>
        member._id === value ||
        member.user.email.toLowerCase() === value.trim().toLowerCase(),
    );

    if (!member) {
      this.error(`Could not find the member '${value}' in the team.`);
    }

    return member;
  }

  async resolveRole(value?: string, roles?: ITeamRole[]): Promise<ITeamRole> {
    const candidates = roles || (await this.getRoles());

    if (!value) {
      const roleId = await this.promptList(
        'Please select a role:',
        candidates.map((role) => ({
          name: role.name,
          value: role._id,
        })),
      );
      return candidates.find((role) => role._id === roleId)!;
    }

    const search = value.trim().toLowerCase();
    const role = candidates.find(
      (role) => role._id === value || role.name.toLowerCase() === search,
    );

    if (!role) {
      this.error(`Could not find the role '${value}' in the team.`);
    }

    return role;
  }

  // Parses a 'type:name' permission, e.g. 'project:deploy'.
  parsePermission(
    value: string,
    available: ITeamPermission[],
  ): ITeamPermissionRef {
    const [type, name] = value.trim().split(':');
    const permission = available.find(
      (permission) => permission.type === type && permission.name === name,
    );

    if (!permission) {
      this.error(`Invalid permission '${value}'. Available permissions:
${available.map((permission) => `  ${permissionLabel(permission)}`).join('\n')}`);
    }

    return { type, name };
  }

  async promptList(
    message: string,
    choices: { name: string; value: string }[],
    defaultValue?: string,
  ): Promise<string> {
    const { value } = (await inquirer.prompt({
      name: 'value',
      type: 'list',
      message,
      choices,
      default: defaultValue,
    })) as { value: string };

    return value;
  }

  async confirm(message: string): Promise<boolean> {
    const { confirmation } = (await inquirer.prompt({
      name: 'confirmation',
      type: 'confirm',
      message,
      default: false,
    })) as { confirmation: boolean };

    return confirmation;
  }

  // Keeps the team selected via 'liara team:use' in sync after the team is
  // renamed, deleted or left. Without `team`, the selection is cleared. Returns
  // whether any saved account was updated.
  async syncSelectedTeam(
    teamId: string,
    team?: IAccountTeam,
    accountName?: string,
  ): Promise<boolean> {
    const liara_json = await this.readGlobalConfig();
    let changed = false;

    for (const [name, account] of Object.entries(liara_json.accounts)) {
      if (account.team?.id !== teamId) continue;
      if (accountName && name !== accountName) continue;

      if (team) {
        account.team = team;
      } else {
        delete account.team;
      }

      changed = true;
    }

    if (changed) {
      fs.writeFileSync(
        GLOBAL_CONF_PATH,
        JSON.stringify({
          version: GLOBAL_CONF_VERSION,
          accounts: liara_json.accounts,
        }),
      );
    }

    return changed;
  }
}
