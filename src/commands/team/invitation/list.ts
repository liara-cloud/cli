import { ux } from '@oclif/core';
import Command, { roleLabel } from '../../../team-command.js';

export default class TeamInvitationList extends Command {
  static description = 'list the pending invitations of a team';

  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
  };

  static aliases = ['team:invitation:ls'];

  async run() {
    const { flags } = await this.parse(TeamInvitationList);
    const team = await this.setupTeam(flags);

    const invitations = await this.getInvitations();

    if (invitations.length === 0) {
      this.log(`There are no pending invitations for ${team.name}.`);
      return;
    }

    const invitationsData = invitations.map((invitation) => ({
      Email: invitation.email,
      Role: invitation.role ? roleLabel(invitation.role.name) : '-',
    }));

    ux.table(invitationsData, { Email: {}, Role: {} }, flags);
  }
}
