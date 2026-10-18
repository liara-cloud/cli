import inquirer from 'inquirer';
import { Flags } from '@oclif/core';
import Command, { requireInput } from '../../team-command.js';

export default class TeamRename extends Command {
  static description = 'rename a team';

  static flags = {
    ...Command.flags,
    name: Flags.string({ char: 'n', description: 'new team name' }),
  };

  async run() {
    const { flags } = await this.parse(TeamRename);
    const team = await this.setupTeam(flags);

    const name = (flags.name ?? (await this.promptName())).trim();

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
      validate: requireInput,
    })) as { name: string };

    return name;
  }
}
