import { Flags } from '@oclif/core';
import Command, {
  permissionLabel,
  resourceLabel,
} from '../../../team-command.js';
import { ITeamAssignedPermission } from '../../../types/team.js';

const grantLabel = (grant: ITeamAssignedPermission) =>
  `${permissionLabel(grant)} on ${resourceLabel(grant)} for ${grant.member.user.email}`;

export default class TeamPermissionRevoke extends Command {
  static description = `revoke a permission assigned to a team member
The flags narrow down the assigned permissions. You'll be asked to pick one if more than one matches.`;

  static flags = {
    ...Command.flags,
    member: Flags.string({
      char: 'm',
      description: 'email of the member',
    }),
    resource: Flags.string({
      char: 'r',
      description: 'name of the resource, e.g. the app name',
    }),
    permission: Flags.string({
      char: 'p',
      description: 'permission as type:name, e.g. project:deploy',
    }),
    yes: Flags.boolean({
      char: 'y',
      description: 'say yes to continue prompt',
    }),
  };

  async run() {
    const { flags } = await this.parse(TeamPermissionRevoke);
    const team = await this.setupTeam(flags);

    const grants = await this.getAssignedPermissions();
    if (grants.length === 0) {
      this.error(`No permissions are assigned in ${team.name}.`);
    }

    const member = flags.member?.trim().toLowerCase();
    const resource = flags.resource?.trim();
    const permission = flags.permission?.trim();

    const matches = grants.filter(
      (grant) =>
        (!member || grant.member.user.email.toLowerCase() === member) &&
        (!resource || resourceLabel(grant) === resource) &&
        (!permission || permissionLabel(grant) === permission),
    );

    if (matches.length === 0) {
      this.error('Could not find a matching assigned permission.');
    }

    const grantId =
      matches.length === 1
        ? matches[0]._id
        : await this.promptList(
            'Please select a permission:',
            matches.map((grant) => ({
              name: grantLabel(grant),
              value: grant._id,
            })),
          );

    const grant = matches.find((grant) => grant._id === grantId)!;

    if (
      !flags.yes &&
      !(await this.confirm(
        `Are you sure you want to revoke ${grantLabel(grant)}?`,
      ))
    ) {
      this.log('Operation cancelled');
      return;
    }

    await this.got.delete(this.teamPath(`/${grant._id}/revoke-permission`));
    this.log(`Revoked ${grantLabel(grant)}.`);
  }
}
