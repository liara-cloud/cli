import { ux } from '@oclif/core';
import Command from '../../../team-command.js';

export default class TeamMemberList extends Command {
  static description = 'list the members of a team';

  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
  };

  static aliases = ['team:member:ls'];

  async run() {
    const { flags } = await this.parse(TeamMemberList);
    await this.setupTeam(flags);

    const members = await this.getMembers();

    const membersData = members.map((member) => ({
      Name: member.user.fullname,
      Email: member.user.email,
      Role: member.role.name,
    }));

    ux.table(membersData, { Name: {}, Email: {}, Role: {} }, flags);
  }
}
