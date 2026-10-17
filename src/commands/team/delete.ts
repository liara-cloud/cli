import { Flags } from '@oclif/core';
import Command from '../../team-command.js';

export default class TeamDelete extends Command {
  static description = 'delete a team';

  static flags = {
    ...Command.flags,
    yes: Flags.boolean({
      char: 'y',
      description: 'say yes to continue prompt',
    }),
  };

  static aliases = ['team:rm'];

  async run() {
    const { flags } = await this.parse(TeamDelete);
    const team = await this.setupTeam(flags);

    if (
      !flags.yes &&
      !(await this.confirm(
        `Are you sure you want to delete the team "${team.name}"?`,
      ))
    ) {
      this.log('Operation cancelled');
      return;
    }

    await this.got.delete(this.teamPath());
    this.log(`Team ${team.name} deleted.`);

    if (await this.syncSelectedTeam(team._id)) {
      this.log('> Switched to your personal account.');
    }
  }
}
