import { ux } from '@oclif/core';
import Command, {
  permissionLabel,
  resourceLabel,
} from '../../../team-command.js';

export default class TeamPermissionList extends Command {
  static description =
    'list the permissions assigned to team members on resources';

  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
  };

  static aliases = ['team:permission:ls'];

  async run() {
    const { flags } = await this.parse(TeamPermissionList);
    const team = await this.setupTeam(flags);

    const grants = await this.getAssignedPermissions();

    if (grants.length === 0) {
      this.log(`No permissions are assigned in ${team.name}.`);
      return;
    }

    const grantsData = grants.map((grant) => ({
      Member: grant.member.user.email,
      Permission: permissionLabel(grant),
      Resource: resourceLabel(grant),
    }));

    ux.table(grantsData, { Member: {}, Permission: {}, Resource: {} }, flags);
  }
}
