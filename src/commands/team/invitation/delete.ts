import { Flags } from '@oclif/core';
import Command from '../../../team-command.js';

export default class TeamInvitationDelete extends Command {
  static description = 'cancel a pending invitation';

  static flags = {
    ...Command.flags,
    invitation: Flags.string({
      char: 'i',
      description: 'invited email or invitation ID',
    }),
    yes: Flags.boolean({
      char: 'y',
      description: 'say yes to continue prompt',
    }),
  };

  static aliases = ['team:invitation:rm'];

  async run() {
    const { flags } = await this.parse(TeamInvitationDelete);
    const team = await this.setupTeam(flags);

    const invitations = await this.getInvitations();
    if (invitations.length === 0) {
      this.error(`There are no pending invitations for ${team.name}.`);
    }

    const search = flags.invitation?.trim().toLowerCase();
    const invitationId = search
      ? invitations.find(
          (invitation) =>
            invitation._id === flags.invitation ||
            invitation.email.toLowerCase() === search,
        )?._id
      : await this.promptList(
          'Please select an invitation:',
          invitations.map((invitation) => ({
            name: invitation.email,
            value: invitation._id,
          })),
        );

    const invitation = invitations.find(
      (invitation) => invitation._id === invitationId,
    );
    if (!invitation) {
      this.error(
        `Could not find a pending invitation for '${flags.invitation}'.`,
      );
    }

    if (
      !flags.yes &&
      !(await this.confirm(
        `Are you sure you want to cancel the invitation of ${invitation.email}?`,
      ))
    ) {
      this.log('Operation cancelled');
      return;
    }

    await this.got.delete(this.teamPath(`/invitations/${invitation._id}`));
    this.log(`Invitation of ${invitation.email} cancelled.`);
  }
}
