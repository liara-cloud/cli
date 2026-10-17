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
  DEFAULT_TEAM_ROLES,
  GLOBAL_CONF_PATH,
  GLOBAL_CONF_VERSION,
  PERSONAL_ACCOUNT_NAME,
  TEAM_RESOURCE_NAME_FIELDS,
} from './constants.js';

const PAGE_SIZE = 100;

// Messages for the `data.code` of team API errors.
const TEAM_ERRORS: { [code: string]: string } = {
  account_verification_required:
    'Your account is not verified. Please verify it at https://console.liara.ir, first.',
  already_joined: 'You are already a member of this team.',
  cannot_assign_permission_to_team_creator:
    'The team owner already has every permission.',
  cannot_change_team_creator_role: "The team owner's role cannot be changed.",
  cannot_change_team_creator_to_yourself:
    'You are already the owner of this team.',
  cannot_delete_team_with_resources_or_members:
    'The team still owns resources. Delete them before deleting the team.',
  cannot_delete_team_with_usage_in_current_month:
    'The team has been charged for usage this month. It can be deleted after the month ends.',
  cannot_leave_team_as_creator:
    "The team owner cannot leave the team. Transfer the ownership via 'liara team:change-owner' or delete the team.",
  cannot_remove_team_creator: 'The team owner cannot be removed.',
  cannot_revoke_permission_from_team_creator:
    "The team owner's permissions cannot be revoked.",
  custom_role_already_exists: 'A role with this name already exists.',
  custom_role_not_found: 'Could not find the custom role.',
  invalid_invitation_token:
    'The invitation is invalid or has expired. It must be accepted with the account it was sent to.',
  invitation_already_exists:
    "This email already has a pending invitation. Cancel it via 'liara team:invitation:delete' to invite again.",
  invitation_not_found: 'Could not find the invitation.',
  max_custom_roles_reached: 'The team has reached its custom role limit.',
  max_permissions_reached:
    'The team has reached its limit of assigned permissions.',
  max_team_members_reached: 'The team has reached its member limit.',
  max_teams_reached: 'You have reached the maximum number of teams.',
  member_not_found: 'Could not find the member.',
  no_permission: "You don't have permission to do this in the team.",
  not_allowed_to_change_team_creator:
    'Only the team owner can transfer the ownership.',
  not_allowed_to_delete_team: 'Only the team owner can delete the team.',
  permission_already_exists:
    'The member already has a permission on this resource. Revoke it first to change the level.',
  permission_not_found: 'Could not find the permission.',
  positive_balance: 'A team with a positive balance cannot be deleted.',
  role_in_use: 'The role is assigned to a member. Change their role first.',
  role_not_found: 'Could not find the role.',
  target_member_role_should_be_the_same_as_yours:
    "The new owner must have the same role as you. Give them the Owner role via 'liara team:member:set-role', first.",
  team_already_exists: 'You already have a team with this name.',
  team_creator_already_changed:
    'The ownership of this team has already been transferred once and cannot be transferred again.',
  team_not_found: 'Could not find the team.',
  project_not_found: 'Could not find the app in the team.',
  database_not_found: 'Could not find the database in the team.',
  zone_not_found: 'Could not find the zone in the team.',
  bucket_not_found: 'Could not find the bucket in the team.',
  mail_server_not_found: 'Could not find the mail server in the team.',
  vm_not_found: 'Could not find the VM in the team.',
  ai_not_found: 'Could not find the AI workspace in the team.',
};

export const isObjectId = (value: string) => /^[\da-f]{24}$/i.test(value);

export const roleLabel = (name: string) => DEFAULT_TEAM_ROLES[name] || name;

export const memberLabel = ({ user }: { user: ITeamMember['user'] }) =>
  `${user.fullname} <${user.email}>`;

export const permissionLabel = ({ type, name }: ITeamPermissionRef) =>
  `${type}:${name}`;

export const resourceLabel = (grant: ITeamAssignedPermission) => {
  const resource = grant[grant.type];
  return resource?.[TEAM_RESOURCE_NAME_FIELDS[grant.type]] || resource?._id;
};

export const validateTeamName = (name: string): string | true => {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 50) {
    return 'The team name must be between 3 and 50 characters.';
  }

  if (trimmed === PERSONAL_ACCOUNT_NAME) {
    return `"${PERSONAL_ACCOUNT_NAME}" is reserved for the personal account.`;
  }

  return true;
};

const parseErrorBody = (
  body: unknown,
): { message?: string; data?: { code?: string } } => {
  try {
    return (typeof body === 'string' ? JSON.parse(body) : body) || {};
  } catch {
    return {};
  }
};

export default abstract class TeamCommand extends Command {
  // Overrides TEAM_ERRORS for codes that mean something specific to a command.
  errorMessages: { [code: string]: string } = {};

  team!: ITeam;

  async catch(error: any) {
    if (error.response) {
      const { message, data } = parseErrorBody(error.response.body);
      const code = data?.code;
      const errorMessage =
        (code && (this.errorMessages[code] || TEAM_ERRORS[code])) || message;

      if (errorMessage) {
        this.error(errorMessage);
      }
    }

    if (error.name === 'TimeoutError') {
      this.error(
        'The request timed out. Please make sure your role in the team allows this action.',
      );
    }

    return super.catch(error);
  }

  // Resolves the team to act on: the --team-id flag, then the team selected via
  // 'liara team:use', then a prompt. Checking membership here gives a clear
  // error instead of the API's response for teams the user isn't in.
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
          name: `${memberLabel(member)} - ${roleLabel(member.role.name)}`,
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

  // Finds a role by ID, name or English name of a default role, or prompts for one.
  async resolveRole(value?: string, roles?: ITeamRole[]): Promise<ITeamRole> {
    const candidates = roles || (await this.getRoles());

    if (!value) {
      const roleId = await this.promptList(
        'Please select a role:',
        candidates.map((role) => ({
          name: roleLabel(role.name),
          value: role._id,
        })),
      );
      return candidates.find((role) => role._id === roleId)!;
    }

    const search = value.trim().toLowerCase();
    const role = candidates.find(
      (role) =>
        role._id === value ||
        role.name === value.trim() ||
        DEFAULT_TEAM_ROLES[role.name]?.toLowerCase() === search,
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
