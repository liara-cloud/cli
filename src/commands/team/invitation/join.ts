import inquirer from 'inquirer';
import { Flags } from '@oclif/core';

import { ITeamInvitationInfo } from '../../../types/team.js';
import Command, { roleLabel } from '../../../team-command.js';

export default class TeamInvitationJoin extends Command {
  static description = 'accept an invitation to a team';

  static flags = {
    ...Command.flags,
    token: Flags.string({
      char: 't',
      description: 'invitation link or token',
    }),
    yes: Flags.boolean({
      char: 'y',
      description: 'say yes to continue prompt',
    }),
  };

  static aliases = ['team:join'];

  async run() {
    const { flags } = await this.parse(TeamInvitationJoin);

    await this.setGotConfig({ ...flags, 'team-id': '' });

    const token = this.parseToken(flags.token || (await this.promptToken()));
    const searchParams = { token };

    const info = await this.got('v2/teams/invitations/get-team-info', {
      searchParams,
    }).json<ITeamInvitationInfo>();

    if (
      !flags.yes &&
      !(await this.confirm(
        `Join the team "${info.teamName}" as ${roleLabel(info.roleName)}?`,
      ))
    ) {
      this.log('Operation cancelled');
      return;
    }

    await this.got.post('v2/teams/invitations/join', { searchParams });

    this.log(`You joined the team ${info.teamName}.`);
    this.log(`Use it via 'liara team:use --team "${info.teamName}"'.`);
  }

  // Accepts the invitation link from the email, or just its token.
  parseToken(value: string): string {
    const match = value.match(/[&?]token=([^\s&]+)/);
    return match ? decodeURIComponent(match[1]) : value.trim();
  }

  async promptToken(): Promise<string> {
    const { token } = (await inquirer.prompt({
      name: 'token',
      type: 'input',
      message: 'Enter the invitation link or token:',
      validate: (input: string) => input.trim().length > 0,
    })) as { token: string };

    return token;
  }
}
