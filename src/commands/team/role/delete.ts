import { Flags } from '@oclif/core';
import Command from '../../../team-command.js';

export default class TeamRoleDelete extends Command {
  static description = 'delete a custom role from a team';

  static flags = {
    ...Command.flags,
    role: Flags.string({ char: 'r', description: 'name or ID of the role' }),
    yes: Flags.boolean({
      char: 'y',
      description: 'say yes to continue prompt',
    }),
  };

  static aliases = ['team:role:rm'];

  async run() {
    const { flags } = await this.parse(TeamRoleDelete);
    const team = await this.setupTeam(flags);

    const customRoles = (await this.getRoles()).filter((role) => role.isCustom);
    if (customRoles.length === 0) {
      this.error(`${team.name} has no custom roles.`);
    }

    const role = await this.resolveRole(flags.role, customRoles);

    if (
      !flags.yes &&
      !(await this.confirm(
        `Are you sure you want to delete the role "${role.name}"?`,
      ))
    ) {
      this.log('Operation cancelled');
      return;
    }

    await this.got.delete(this.teamPath(`/custom-role/${role._id}`));
    this.log(`Role ${role.name} deleted.`);
  }
}
