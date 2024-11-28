import { Args, Flags } from '@oclif/core';
import fs from 'fs-extra';
import ora, { Ora } from 'ora';
import inquirer from 'inquirer';
import Command, {
  IGetDomainsResponse,
  IProjectDetailsResponse,
} from '../base.js';
import IGetProjectsResponse from '../types/get-project-response.js';

export default class Init extends Command {
  static override description = 'describe the command here';

  static override examples = ['<%= config.bin %> <%= command.id %>'];

  static override flags = {
    ...Command.flags,
    force: Flags.boolean({ char: 'f' }),
    name: Flags.string({ char: 'n', description: 'name to print' }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Init);
    await this.setGotConfig(flags);
    await this.promptProject();
  }
  async promptProject(): Promise<string> {
    // this.spinner.start('Loading...\n');

    try {
      const { projects } =
        await this.got('v1/projects').json<IGetProjectsResponse>();
      // this.spinner.stop();
      if (!projects.length) {
        this.warn(
          'Please go to https://console.liara.ir/apps and create an app, first.',
        );
        this.exit(1);
      }

      const { project } = (await inquirer.prompt({
        name: 'project',
        type: 'list',
        message: 'Please select an app:',
        choices: [...projects.map((project) => project.project_id)],
      })) as { project: string };

      return project;
    } catch (error) {
      // this.spinner.stop();
      throw error;
    }
  }
}
