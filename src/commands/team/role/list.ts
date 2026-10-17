import { ux } from '@oclif/core';
import Command, { permissionLabel, roleLabel } from '../../../team-command.js';

export default class TeamRoleList extends Command {
  static description = 'list the roles of a team';

  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
  };

  static aliases = ['team:role:ls'];

  async run() {
    const { flags } = await this.parse(TeamRoleList);
    await this.setupTeam(flags);

    const roles = await this.getRoles();

    const rolesData = roles.map((role) => ({
      Name: roleLabel(role.name),
      Type: role.isCustom ? 'custom' : 'default',
      Permissions: role.permissions.map(permissionLabel).join(', ') || '-',
    }));

    ux.table(rolesData, { Name: {}, Type: {}, Permissions: {} }, flags);
  }
}
