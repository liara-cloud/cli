import { Args, Config, Flags } from '@oclif/core';
import fs from 'fs-extra';
import validatePort from '../utils/validate-port.js';
import ora, { Ora, spinners } from 'ora';
import { getPort, getDefaultPort } from '../utils/get-port.js';
import inquirer, { Answers } from 'inquirer';
import chalk from 'chalk';

import Command, {
  IGetDiskResponse,
  IGetDomainsResponse,
  IProject,
  IProjectDetailsResponse,
} from '../base.js';
import IGetProjectsResponse from '../types/get-project-response.js';
import ILiaraJSON from '../types/liara-json.js';
import supportedVersions from '../utils/getSupportedVersions.js';

export default class Init extends Command {
  static override description =
    'With this command, you can create a liara.json file';

  static override examples = ['<%= config.bin %> <%= command.id %>'];

  static override flags = {
    ...Command.flags,
    y: Flags.boolean({
      char: 'y',
      description: 'create an example file',
      aliases: [],
    }),
  };
  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Init);

    try {
      await this.setGotConfig(flags);
      this.log(
        chalk.yellow(`This utility will guide you through creating a liara.json file.
It only covers the most common fields and tries to guess sensible defaults.
For detailed documentation on these fields and what they do, refer to the official documentation.

Afterwards, use liara deploy to deploy your project.

Press ^C at any time to quit.
`),
      );
      this.spinner = ora();
      const projects = await this.getPlatformsInfo();
      const appName = await this.promptProjectName(projects);
      const buildLocation = await this.buildLocationPrompt();
      const platform = this.findPlatform(projects, appName);
      const port = await this.getAppPort(platform, appName);
      const version = await this.promptPlatformVersion(platform);
      const disks = await this.getAppDisks(appName, projects);
      const diskConfigs = await this.promptDiskConfig(disks);
      const configs = this.setLiaraJsonConfigs(
        port,
        appName,
        buildLocation,
        platform,
        version,
        diskConfigs,
      );
      this.createLiaraJsonFile(configs);
    } catch (error) {
      throw error;
    }
  }
  async getPlatformsInfo(): Promise<IProject[]> {
    try {
      this.spinner.start();

      const { projects } =
        await this.got('v1/projects').json<IGetProjectsResponse>();
      this.spinner.stop();
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
      this.spinner.start();
      await fs.writeFile(
        `${process.cwd()}/liara.json`,
        JSON.stringify(configs, null, 2),
      );
      this.spinner.succeed('Liara.json file is successfully created!');
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
    diskConfigs: { disk: string; path: string } | null,
  ): ILiaraJSON {
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
    if (diskConfigs !== null) {
      configs['disks'] = [
        {
          name: diskConfigs.disk,
          mountTo: diskConfigs.path,
        },
      ];
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
  async getAppDisks(AppName: string, projects: IProject[]) {
    try {
      this.spinner.start();
      const project = projects.find((project) => {
        return project.project_id === AppName;
      });
      const disks = await this.got(
        `v1/projects/${project?._id}/disks`,
      ).json<IGetDiskResponse>();
      this.spinner.stop();
      return disks.disks;
    } catch (error) {
      throw error;
    }
  }
  async setDiskConfigAnswer(): Promise<boolean> {
    const { setDisk } = (await inquirer.prompt({
      message: 'Set disk configs? ',
      type: 'confirm',
      name: 'setDisk',
      default: false,
    })) as { setDisk: boolean };
    return setDisk;
  }
  async promptDiskConfig(
    disks: object[],
  ): Promise<{ disk: string; path: string } | null> {
    try {
      if (disks.length > 0) {
        const { setDisk } = (await inquirer.prompt({
          message: 'Set disk configs? ',
          type: 'confirm',
          name: 'setDisk',
          default: false,
        })) as { setDisk: boolean };
        if (setDisk) {
          const diskConfigs = (await inquirer.prompt([
            {
              message: 'Disk name: ',
              choices: disks,
              name: 'disk',
              type: 'list',
            },
            {
              message: 'MountTO: ',
              name: 'path',
              type: 'input',
            },
          ])) as { disk: string; path: string };
          return diskConfigs;
        }
      }
      return null;
    } catch (error) {
      throw error;
    }
  }
}
