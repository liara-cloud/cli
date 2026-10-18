import { Flags } from '@oclif/core';
import Command, { memberLabel } from '../../../team-command.js';

export default class TeamMemberSetRole extends Command {
  static description = "change a team member's role";

  static flags = {
    ...Command.flags,
    member: Flags.string({
      char: 'm',
      description: 'email or ID of the member',
    }),
    role: Flags.string({
      char: 'r',
      description: 'name or ID of the role',
    }),
  };

  async run() {
    const { flags } = await this.parse(TeamMemberSetRole);
    await this.setupTeam(flags);

    const member = await this.resolveMember(flags.member);
    const role = await this.resolveRole(flags.role);

    await this.got.post(
      this.teamPath(`/change-member-role/${member._id}/${role._id}`),
    );

    this.log(`Role of ${memberLabel(member)} changed to ${role.name}.`);
  }
}
