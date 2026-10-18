import { Flags } from '@oclif/core';
import Command, { memberLabel } from '../../../team-command.js';

export default class TeamMemberRemove extends Command {
  static description = 'remove a member from a team';

  static flags = {
    ...Command.flags,
    member: Flags.string({
      char: 'm',
      description: 'email or ID of the member',
    }),
    yes: Flags.boolean({
      char: 'y',
      description: 'say yes to continue prompt',
    }),
  };

  static aliases = ['team:member:rm'];

  async run() {
    const { flags } = await this.parse(TeamMemberRemove);
    const team = await this.setupTeam(flags);
    const member = await this.resolveMember(flags.member);

    if (
      !flags.yes &&
      !(await this.confirm(
        `Are you sure you want to remove ${memberLabel(member)} from "${team.name}"?`,
      ))
    ) {
      this.log('Operation cancelled');
      return;
    }

    await this.got.delete(this.teamPath(`/${member._id}`));
    this.log(`${memberLabel(member)} removed from ${team.name}.`);
  }
}
