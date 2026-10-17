import { Flags } from '@oclif/core';
import Command from '../../team-command.js';

export default class TeamLeave extends Command {
  static description = 'leave a team';

  static flags = {
    ...Command.flags,
    yes: Flags.boolean({
      char: 'y',
      description: 'say yes to continue prompt',
    }),
  };

  async run() {
    const { flags } = await this.parse(TeamLeave);

    // Only the account that left loses access to the team. This is read before
    // setupTeam, which fills in the account's api token on flags.
    const accountName = flags['api-token']
      ? undefined
      : flags.account || (await this.getCurrentAccount()).accountName;

    const team = await this.setupTeam(flags);

    if (
      !flags.yes &&
      !(await this.confirm(
        `Are you sure you want to leave the team "${team.name}"?`,
      ))
    ) {
      this.log('Operation cancelled');
      return;
    }

    await this.got.delete(this.teamPath('/leave'));
    this.log(`You left the team ${team.name}.`);

    if (
      accountName &&
      (await this.syncSelectedTeam(team._id, undefined, accountName))
    ) {
      this.log('> Switched to your personal account.');
    }
  }
}
