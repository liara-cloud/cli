import { Args, Flags } from '@oclif/core';
import fs from 'fs-extra';
import validatePort from '../utils/validate-port.js';
import ora, { Ora } from 'ora';
import { getPort, getDefaultPort } from '../utils/get-port.js';
import inquirer from 'inquirer';
import Command, {
  IGetDomainsResponse,
  IProject,
  IProjectDetailsResponse,
} from '../base.js';
import IGetProjectsResponse from '../types/get-project-response.js';
import ILiaraJSON from '../types/liara-json.js';
import supportedVersions from '../utils/getSupportedVersions.js';
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
    const projects = await this.getPlatformsInfo();
    const appName = await this.promptProjectName(projects);
    const buildLocation = await this.buildLocationPrompt();
    const platform = this.findPlatform(projects, appName);
    const port = await this.getAppPort(platform, appName);
    const configs: ILiaraJSON = {
      port,
      app: appName,
      build: {
        location: buildLocation,
      },
    };
    this.createLiaraJsonFile(configs);
  }
  async getPlatformsInfo(): Promise<IProject[]> {
    try {
      const { projects } =
        await this.got('v1/projects').json<IGetProjectsResponse>();
      return projects as IProject[];
    } catch (error) {
      throw error;
    }
  }
  async promptProjectName(projects: IProject[]): Promise<string> {
    try {
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
      throw error;
    }
  }
  findPlatform(projects: IProject[], appName: string): string {
    const project = projects.find((project) => {
      return project.project_id === appName;
    });
    return project!.type;
  }
  async getAppPort(platform: string, appName: string): Promise<number> {
    const defaultPort = getPort(platform);
    if (!defaultPort) {
      const port = await this.promptPort(appName);
      return port;
    }
    return defaultPort;
  }
  async buildLocationPrompt() {
    try {
      const { location } = (await inquirer.prompt({
        message: 'Build location',
        name: 'location',
        type: 'list',
        default: 'iran',
        choices: ['iran', 'germany'],
      })) as { location: string };
      return location;
    } catch (error) {
      throw error;
    }
  }
  async createLiaraJsonFile(configs: ILiaraJSON) {
    try {
      await fs.writeFile(
        `${process.cwd()}/liara.json`,
        JSON.stringify(configs, null, 2),
      );
    } catch (error) {
      throw new Error('There was a problem while creating liara.json file!');
    }
  }
}
