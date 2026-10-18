import inquirer from 'inquirer';
import { Flags } from '@oclif/core';
import { validate as validateEmail } from 'email-validator';

import Command from '../../../team-command.js';

export default class TeamInvitationCreate extends Command {
  static description = 'invite someone to a team by email';

  static flags = {
    ...Command.flags,
    email: Flags.string({ char: 'e', description: 'email to invite' }),
    role: Flags.string({
      char: 'r',
      description: 'name or ID of the role',
      exclusive: ['role-id'],
    }),
    'role-id': Flags.string({
      description: "ID of the role, sent without looking up the team's roles",
    }),
  };

  static aliases = ['team:invite'];

  async run() {
    const { flags } = await this.parse(TeamInvitationCreate);
    await this.setupTeam(flags);

    const email = (flags.email || (await this.promptEmail())).trim();
    if (!validateEmail(email)) {
      this.error(`Invalid email: ${email}`);
    }

    const roleID = flags['role-id'] || (await this.resolveRole(flags.role))._id;

    const { link } = await this.got
      .post(this.teamPath('/invitations'), { json: { email, roleID } })
      .json<{ link: string }>();

    this.log(`Invitation sent to ${email}.`);
    this.log(`Invitation link: ${link}`);
  }

  async promptEmail(): Promise<string> {
    const { email } = (await inquirer.prompt({
      name: 'email',
      type: 'input',
      message: 'Enter the email to invite:',
      validate: (input: string) =>
        validateEmail(input.trim()) || 'Please enter a valid email.',
    })) as { email: string };

    return email;
  }
}
