import { Flags } from '@oclif/core';
import Command, { memberLabel } from '../../team-command.js';

export default class TeamChangeOwner extends Command {
  static description = 'transfer the ownership of a team to another member';

  static flags = {
    ...Command.flags,
    member: Flags.string({
      char: 'm',
      description: 'email or ID of the new owner',
    }),
    yes: Flags.boolean({
      char: 'y',
      description: 'say yes to continue prompt',
    }),
  };

  async run() {
    const { flags } = await this.parse(TeamChangeOwner);
    const team = await this.setupTeam(flags);
    const member = await this.resolveMember(flags.member);

    if (
      !flags.yes &&
      !(await this.confirm(
        `Transfer the ownership of "${team.name}" to ${memberLabel(member)}?`,
      ))
    ) {
      this.log('Operation cancelled');
      return;
    }

    await this.got.post(this.teamPath(`/${member._id}/change-team-creator`));
    this.log(`${memberLabel(member)} is now the owner of ${team.name}.`);
  }
}
