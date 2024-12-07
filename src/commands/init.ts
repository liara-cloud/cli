import { Args, Config, Flags } from '@oclif/core';
import fs from 'fs-extra';
import ora from 'ora';
import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';

import { promptPort } from '../utils/promptPort.js';
import Command, { IProject } from '../base.js';
import { getPort } from '../utils/get-port.js';
import IGetProjectsResponse from '../types/get-project-response.js';
import ILiaraJSON from '../types/liara-json.js';
import supportedVersions from '../utils/getSupportedVersions.js';
import detectPlatform from '../utils/detect-platform.js';
import { IDisk, IGetDiskResponse } from '../types/getDiskResponse.js';
import { AVAILABLE_PLATFORMS } from '../constants.js';

export default class Init extends Command {
  static override description =
    'With this command, you can create a liara.json file';

  static override examples = ['<%= config.bin %> <%= command.id %>'];

  static override flags = {
    ...Command.flags,
    y: Flags.boolean({
      char: 'y',
      description: 'Create an example file',
      aliases: [],
    }),
    name: Flags.string({
      char: 'n',
      description: 'Your app name',
    }),
    port: Flags.integer({
      char: 'p',
      description: 'Port your app listens to',
    }),
    platform: Flags.string({
      char: 'P',
      description: 'App platform',
    }),
    version: Flags.string({
      char: 'v',
      description: 'Platform Version',
    }),
    'build-location': Flags.string({
      description: 'Build location',
      aliases: ['location'],
    }),
    'no-disk': Flags.boolean({
      description: 'No disk config',
      exclusive: ['disk', 'path'],
    }),
    disk: Flags.string({
      description: 'Disk name',
      char: 'd',
      dependsOn: ['path'],
    }),
    path: Flags.string({
      description: 'The path where you want to mount the disk',
      dependsOn: ['disk'],
    }),
  };
  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Init);

    try {
      await this.setGotConfig(flags);
      this.log(
        chalk.yellow(`This command interactively creates a basic liara.json configuration file.
It includes only the essential settings; additional configurations must be added manually.
📚 For more details on each field and its usage, visit: https://docs.liara.ir/paas/liarajson/.

Afterwards, use liara deploy to deploy your project.

🔑 Press ^C at any time to quit.
`),
      );
      this.spinner = ora();
      if (flags.y) {
        const dirName = path.basename(process.cwd());
        const platform = detectPlatform(process.cwd());
        const diskConfig = {
          disk: 'media',
          path: '/uploads/media',
        };
        const configs = this.setLiaraJsonConfigs(
          getPort(platform) || 3000,
          dirName,
          'iran',
          platform,
          supportedVersions(platform)?.defaultVersion,
          diskConfig,
        );
        await this.createLiaraJsonFile(configs);
        this.log(
          chalk.yellow(
            "🚫 This file is just a sample file, don't use it for deployment.",
          ),
        );
        this.exit(0);
      }
      const projects = await this.getPlatformsInfo();
      const appName = await this.promptProjectName(projects, flags.name);
      const buildLocation = await this.buildLocationPrompt(
        flags['build-location'],
      );
      const platform = await this.findPlatform(
        projects,
        appName,
        flags.platform,
      );
      const port = await this.getAppPort(platform, flags.port, projects);
      const version = await this.promptPlatformVersion(platform, flags.version);
      const disks = await this.getAppDisks(appName, projects, flags['no-disk']);
      const diskConfigs = await this.promptDiskConfig(
        disks,
        flags.disk,
        flags.path,
      );
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
  async promptProjectName(
    projects: IProject[],
    flagValue: string | undefined,
  ): Promise<string> {
    try {
      if (flagValue) {
        return flagValue;
      }
      if (projects.length == 0) {
        const { project } = (await inquirer.prompt({
          name: 'project',
          type: 'input',
          message: 'Enter app name:',
        })) as { project: string };
        return project;
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
  async findPlatform(
    projects: IProject[],
    appName: string,
    flagsValue: string | undefined,
  ): Promise<string> {
    if (projects.length == 0) {
      const platform = await this.promptPlatform();
      return platform;
    }
    if (flagsValue) {
      return flagsValue;
    }
    const project = projects.find((project) => {
      return project.project_id === appName;
    });
    if (!project) {
      return 'static';
    }
    return project!.type;
  }
  async getAppPort(
    platform: string,
    flagValue: number | undefined,
    projects: IProject[],
  ): Promise<number> {
    try {
      if (flagValue) {
        return flagValue;
      }
      const defaultPort = getPort(platform);
      if (!defaultPort) {
        const port = await promptPort(platform);
        return port;
      }
      return defaultPort;
    } catch (error) {
      throw error;
    }
  }
  async buildLocationPrompt(flagValue: string | undefined): Promise<string> {
    try {
      if (flagValue) {
        return flagValue;
      }
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
  async promptPlatformVersion(
    platform: string,
    flagValue: string | undefined,
  ): Promise<string | undefined> {
    try {
      if (flagValue) {
        return flagValue;
      }
      const versions = supportedVersions(platform);
      if (versions) {
        let message: string | undefined;
        if (['flask', 'django'].includes(platform)) {
          message = 'Python version';
        }
        if (platform === 'laravel') {
          message = 'Php version';
        }
        if (platform === 'next') {
          message = 'Node version';
        }
        if (!message) {
          message = `${platform} version: `;
        }
        const { version } = (await inquirer.prompt({
          message: message || 'Platform version',
          name: 'version',
          type: 'list',
          default: versions.defaultVersion,
          choices: versions.allVersions,
        })) as { version: string };
        return version;
      }
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
      this.spinner.succeed('Liara.json is successfully created!');
    } catch (error) {
      throw new Error('There was a problem while creating liara.json file!');
    }
  }
  setLiaraJsonConfigs(
    port: number,
    appName: string,
    buildLocation: string,
    platform: string,
    platformVersion: string | undefined,
    diskConfigs: { disk: string; path: string } | undefined,
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

    if (platformVersion) {
      (configs as Record<string, any>)[platform] = {
        [versionKey!]: platformVersion,
      };
    }
    if (diskConfigs) {
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
    platformVersion: string | undefined,
  ): string | undefined {
    if (platformVersion) {
      if (['flask', 'django'].includes(platform)) {
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
  async getAppDisks(
    AppName: string,
    projects: IProject[],
    flagsValue: boolean,
  ): Promise<IDisk[] | undefined> {
    try {
      if (flagsValue) {
        return [];
      }
      if (projects.length != 0) {
        this.spinner.start();
        const project = projects.find((project) => {
          return project.project_id === AppName;
        });
        const disks = await this.got(
          `v1/projects/${project?._id}/disks`,
        ).json<IGetDiskResponse>();
        this.spinner.stop();
        return disks.disks;
      }
    } catch (error) {
      throw new Error(
        'There was a problem while getting your app disks, Please try again later.',
      );
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
  async promptPlatform() {
    this.spinner.start('Loading...');

    try {
      this.spinner.stop();

      const { platform } = (await inquirer.prompt({
        name: 'platform',
        type: 'list',
        message: 'Please select a platform:',
        choices: [...AVAILABLE_PLATFORMS.map((platform) => platform)],
      })) as { platform: string };

      return platform;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }
  async promptDiskConfig(
    disks: IDisk[] | undefined,
    diskNameFlag: string | undefined,
    diskPathFlage: string | undefined,
  ): Promise<{ disk: string; path: string } | undefined> {
    try {
      if (diskNameFlag && diskPathFlage) {
        return {
          disk: diskNameFlag,
          path: diskPathFlage,
        };
      }
      const { setDisk } = (await inquirer.prompt({
        message: 'Set disk configs? ',
        type: 'confirm',
        name: 'setDisk',
        default: false,
      })) as { setDisk: boolean };
      if (setDisk) {
        let disk: { disk: string };
        if (disks && disks.length > 0) {
          disk = await inquirer.prompt({
            message: 'Disk name: ',
            name: 'disk',
            choices: disks,
            type: 'list',
          });
        }
        if (!disks || disks.length == 0) {
          disk = await inquirer.prompt({
            message: 'Disk name: ',
            name: 'disk',
            type: 'input',
          });
        }
        const path = await inquirer.prompt({
          message: 'MountTo: ',
          name: 'path',
          type: 'input',
        });
        return { disk: disk!.disk, path: path.path };
      }
    } catch (error) {
      throw error;
    }
  }
}
