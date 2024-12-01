import { Args, Flags } from '@oclif/core';
import fs from 'fs-extra';
import validatePort from '../utils/validate-port.js';
import ora, { Ora } from 'ora';
import { getPort, getDefaultPort } from '../utils/get-port.js';
import inquirer from 'inquirer';
import chalk from 'chalk';

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
    this.log(
      chalk.yellow(`This utility will guide you through creating a liara.json file.
It only covers the most common fields and tries to guess sensible defaults.
For detailed documentation on these fields and what they do, refer to the official documentation.

Afterwards, use liara deploy to deploy your project.

Press ^C at any time to quit.`),
    );
    const projects = await this.getPlatformsInfo();
    const appName = await this.promptProjectName(projects);
    const buildLocation = await this.buildLocationPrompt();
    const platform = this.findPlatform(projects, appName);
    const port = await this.getAppPort(platform, appName);
    const version = await this.promptPlatformVersion(platform);
    const configs = this.setLiaraJsonConfigs(
      port,
      appName,
      buildLocation,
      platform,
      version,
    );
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
  async buildLocationPrompt(): Promise<string> {
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
  async promptPlatformVersion(platform: string): Promise<string | null> {
    try {
      const versions = supportedVersions(platform);
      if (versions !== null) {
        const { version } = (await inquirer.prompt({
          message: `${platform} version: `,
          name: 'version',
          type: 'list',
          default: versions.defaultVersion,
          choices: versions.allVersions,
        })) as { version: string };
        return version;
      }
      return null;
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
  setLiaraJsonConfigs(
    port: number,
    appName: string,
    buildLocation: string,
    platform: string,
    platformVersion: string | null,
  ) {
    const versionKey = this.setVersionKey(platform, platformVersion);
    const configs: ILiaraJSON = {
      platform,
      port,
      app: appName,
      build: {
        location: buildLocation,
      },
    };

    if (platformVersion !== null) {
      (configs as Record<string, any>)[platform] = {
        [versionKey!]: platformVersion,
      };
    }
    return configs;
  }
  setVersionKey(
    platform: string,
    platformVersion: string | null,
  ): string | null {
    if (platformVersion == null) {
      return null;
    }
    if (platform in ['flask', 'django']) {
      return 'pythonVersion';
    }
    if (platform == 'laravel') {
      return 'phpVersion';
    }
    if (platform == 'next') {
      return 'nodeVersion';
    }
    return 'version';
  }
}
