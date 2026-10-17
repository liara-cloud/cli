import inquirer from 'inquirer';
import { Flags } from '@oclif/core';
import Command, { validateTeamName } from '../../team-command.js';

export default class TeamRename extends Command {
  static description = 'rename a team';

  static flags = {
    ...Command.flags,
    name: Flags.string({ char: 'n', description: 'new team name' }),
  };

  // The API reuses this code when someone other than the owner renames a team.
  errorMessages = {
    not_allowed_to_change_team_creator:
      'Only the team owner can rename the team.',
  };

  async run() {
    const { flags } = await this.parse(TeamRename);
    const team = await this.setupTeam(flags);

    // The API doesn't validate new names, so they're checked like on create.
    const name = (flags.name ?? (await this.promptName())).trim();
    const nameValidation = validateTeamName(name);
    if (nameValidation !== true) {
      this.error(nameValidation);
    }

    await this.got.post(
      this.teamPath(`/change-team-name/${encodeURIComponent(name)}`),
    );

    await this.syncSelectedTeam(team._id, { id: team._id, name });
    this.log(`Team ${team.name} renamed to ${name}.`);
  }

  async promptName(): Promise<string> {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter the new team name:',
      validate: validateTeamName,
    })) as { name: string };

    return name;
  }
}
