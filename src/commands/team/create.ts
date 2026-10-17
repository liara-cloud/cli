import inquirer from 'inquirer';
import { Flags } from '@oclif/core';

import ITeam from '../../types/team.js';
import { TEAM_COLORS } from '../../constants.js';
import Command, { validateTeamName } from '../../team-command.js';

export default class TeamCreate extends Command {
  static description = 'create a team';

  static flags = {
    ...Command.flags,
    name: Flags.string({ char: 'n', description: 'team name' }),
    color: Flags.string({ description: 'team color', options: TEAM_COLORS }),
  };

  async run() {
    const { flags } = await this.parse(TeamCreate);

    await this.setGotConfig({ ...flags, 'team-id': '' });

    const name = (flags.name ?? (await this.promptName())).trim();
    const nameValidation = validateTeamName(name);
    if (nameValidation !== true) {
      this.error(nameValidation);
    }

    const color = flags.color || (await this.promptColor());

    const team = await this.got
      .post('v2/teams', { json: { name, color } })
      .json<ITeam>();

    this.log(`Team ${team.name} created.`);
    this.log(`Use it via 'liara team:use --team "${team.name}"'.`);
  }

  async promptName(): Promise<string> {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter the team name:',
      validate: validateTeamName,
    })) as { name: string };

    return name;
  }

  async promptColor(): Promise<string> {
    const { color } = (await inquirer.prompt({
      name: 'color',
      type: 'list',
      message: 'Please select a color:',
      choices: TEAM_COLORS,
    })) as { color: string };

    return color;
  }
}
