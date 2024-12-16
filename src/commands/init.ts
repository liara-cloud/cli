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
import supportedVersions from '../utils/get-supported-versions.js';
import detectPlatform from '../utils/detect-platform.js';
import { IDisk, IGetDiskResponse } from '../types/get-disk-response.js';
import { AVAILABLE_PLATFORMS } from '../constants.js';
import IHealthConfig from '../types/health-config.js';

export default class Init extends Command {
  static override description = 'create a liara.json file';

  static override examples = ['<%= config.bin %> <%= command.id %>'];

  static override flags = {
    ...Command.flags,
    y: Flags.boolean({
      char: 'y',
      description: 'create an example file',
      aliases: [],
    }),
    name: Flags.string({
      char: 'n',
      description: 'the name of the app',
    }),
    port: Flags.integer({
      char: 'p',
      description: 'the port your app listens to',
    }),
    platform: Flags.string({
      char: 'P',
      description: 'the platform your app needs to run on',
    }),
    version: Flags.string({
      char: 'v',
      description: 'the version of the platform',
    }),
    'build-location': Flags.string({
      description: "name of the build's location",
      aliases: ['location'],
    }),
    disk: Flags.string({
      description: 'the name of the disk',
      char: 'd',
      dependsOn: ['path'],
    }),
    path: Flags.string({
      description: 'the path where the disk should be mounted',
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

Afterwards, use liara deploy to deploy your app.

🔑 Press ^C at any time to quit.
`),
      );

      this.spinner = ora();

      if (flags.y) {
        try {
          const dirName = path.basename(process.cwd());

          const platform = detectPlatform(process.cwd());
          const diskConfig: { disk: string; path: string }[] = [];
          const configs = this.setLiaraJsonConfigs(
            getPort(platform) || 3000,
            dirName,
            'iran',
            platform,
            supportedVersions(platform)?.defaultVersion,
            diskConfig,
          );
          await this.createLiaraJsonFile(configs);

          this.exit(0);
        } catch (error) {
          this.spinner.stop();
          throw error;
        }
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
      const disks = await this.getAppDisks(appName, projects);
      const diskConfigs = await this.promptDiskConfig(
        disks,
        flags.disk,
        flags.path,
      );
      const cron = await this.promptCron(platform);
      const healthCheck = await this.promptHealthCheck();
      const configs = this.setLiaraJsonConfigs(
        port,
        appName,
        buildLocation,
        platform,
        version,
        diskConfigs,
        healthCheck,
        cron,
      );

      await this.createLiaraJsonFile(configs);
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async getPlatformsInfo(): Promise<IProject[]> {
    try {
      this.spinner.start('Loading...');

      const { projects } =
        await this.got('v1/projects').json<IGetProjectsResponse>();

      this.spinner.stop();
      return projects as IProject[];
    } catch (error) {
      if (error.response && error.response.statusCode === 401) {
        throw new Error(`Authentication failed.  
Please log in using the 'liara login' command.

If you are using an API token for authentication, please consider updating your API token.  
You can still create a sample 'liara.json' file using the 'liara init -y' command.
`);
      }

      throw new Error(`There was something wrong while fetching your apps,
        You can still use 'liara init' with its flags. Use 'liara init --help' for more details.`);
    }
  }
  async promptProjectName(
    projects: IProject[],
    flagValue: string | undefined,
  ): Promise<string> {
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
      message: 'Select an app:',
      choices: [...projects.map((project) => project.project_id)],
    })) as { project: string };
    return project;
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
    if (flagValue) {
      return flagValue;
    }

    const defaultPort = getPort(platform);

    if (!defaultPort) {
      const port = await promptPort(platform);
      return port;
    }
    return defaultPort;
  }

  async buildLocationPrompt(flagValue: string | undefined): Promise<string> {
    if (flagValue) {
      return flagValue;
    }

    const { location } = (await inquirer.prompt({
      message: 'Specify the build location: ',
      name: 'location',
      type: 'list',
      default: 'iran',
      choices: ['iran', 'germany'],
    })) as { location: string };
    return location;
  }

  async promptPlatformVersion(
    platform: string,
    flagValue: string | undefined,
  ): Promise<string | undefined> {
    if (flagValue) {
      return flagValue;
    }

    const versions = supportedVersions(platform);

    if (versions) {
      let message: string | undefined;
      if (['flask', 'django'].includes(platform)) {
        message = 'Select python version';
      }

      if (platform === 'laravel') {
        message = 'Select php version';
      }

      if (platform === 'next') {
        message = 'Select node version';
      }

      if (!message) {
        message = `Selcet ${platform} version: `;
      }

      const { version } = (await inquirer.prompt({
        message: message || 'Select platform version',
        name: 'version',
        type: 'list',
        default: versions.defaultVersion,
        choices: versions.allVersions,
      })) as { version: string };
      return version;
    }
  }

  async createLiaraJsonFile(configs: ILiaraJSON) {
    try {
      this.spinner.start('Loading...');

      await fs.writeFile(
        `${process.cwd()}/liara.json`,
        JSON.stringify(configs, null, 2),
      );
      this.spinner.succeed('liara.json is successfully created!');
    } catch (error) {
      throw new Error('There was a problem while creating liara.json!');
    }
  }

  setLiaraJsonConfigs(
    port: number,
    appName: string,
    buildLocation: string,
    platform: string,
    platformVersion: string | undefined,
    diskConfigs: { disk: string; path: string }[] | undefined,
    healthCheck?: IHealthConfig | undefined,
    cron?: string[] | undefined,
  ): ILiaraJSON {
    const versionKey = this.setVersionKey(platform, platformVersion);

    const configs: ILiaraJSON = {
      port,
      platform,
      app: appName,
      build: {
        location: buildLocation,
      },
    };
    if (cron) {
      configs['cron'] = cron;
    }
    if (healthCheck) {
      configs['healthCheck'] = healthCheck;
    }
    if (platformVersion) {
      (configs as Record<string, any>)[platform] = {
        [versionKey!]: platformVersion,
      };
    }

    if (diskConfigs) {
      configs['disks'] = diskConfigs.map((config) => {
        return { name: config.disk, mountTo: config.path };
      });
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
  ): Promise<IDisk[] | undefined> {
    try {
      if (projects.length != 0) {
        this.spinner.start('Loading...');

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
      if (error.response && error.response.statusCode === 401) {
        throw new Error(`Authentication failed.  
Please log in using the 'liara login' command.

If you are using an API token for authentication, please consider updating your API token.  
You can still create a sample 'liara.json' file using the 'liara init -y' command.
`);
      }

      throw new Error(`There was something wrong while fetching your app info,
         You can still use 'liara init' with it's flags. Use 'liara init --help' for command details.`);
    }
  }

  async promptPlatform() {
    const { platform } = (await inquirer.prompt({
      name: 'platform',
      type: 'list',
      message: 'Select a platform:',
      choices: [...AVAILABLE_PLATFORMS.map((platform) => platform)],
    })) as { platform: string };
    return platform;
  }

  async promptDiskConfig(
    disks: IDisk[] | undefined,
    diskNameFlag: string | undefined,
    diskPathFlage: string | undefined,
  ): Promise<{ disk: string; path: string }[] | undefined> {
    let diskConfig = [];

    if (diskNameFlag && diskPathFlage) {
      return [
        {
          disk: diskNameFlag,
          path: diskPathFlage,
        },
      ];
    }

    const { setDisk } = (await inquirer.prompt({
      message: 'Configure disks? (Default: No)',
      type: 'confirm',
      name: 'setDisk',
      default: false,
    })) as { setDisk: boolean };

    if (setDisk) {
      if (!disks || disks.length == 0) {
        const { diskName } = (await inquirer.prompt({
          message: 'Enter Disk name: ',
          name: 'diskName',
          type: 'input',
        })) as { diskName: string };

        const { path } = (await inquirer.prompt({
          message: 'Specify the mount location: ',
          name: 'path',
          type: 'input',
        })) as { path: string };

        diskConfig = [{ disk: diskName, path: path }];
        return diskConfig;
      }

      let shouldContinue = true;

      while (shouldContinue && disks.length != 0) {
        const { diskName } = (await inquirer.prompt({
          message: 'Select a Disk: ',
          name: 'diskName',
          choices: disks,
          type: 'list',
        })) as { diskName: string };

        const index = disks.findIndex((disk) => disk.name === diskName);
        disks.splice(index, 1);

        const { path } = (await inquirer.prompt({
          message: `Mount path for ${diskName}: `,
          name: 'path',
          type: 'input',
        })) as { path: string };

        diskConfig.push({ disk: diskName, path });

        if (disks.length != 0) {
          const continueAnswer = (await inquirer.prompt({
            message: 'Add another disk? (Default: No)',
            type: 'confirm',
            default: false,
            name: 'shouldContinue',
          })) as { shouldContinue: boolean };
          shouldContinue = continueAnswer.shouldContinue;
        }
      }
      return diskConfig;
    }
  }
  async promptCron(platform: string) {
    if (
      ['next', 'laravel', 'django', 'php', 'python', 'flask', 'go'].includes(
        platform,
      )
    ) {
      const { setCronAnswer } = (await inquirer.prompt({
        message: 'Configure cron? (Default: No)',
        type: 'confirm',
        name: 'setCronAnswer',
        default: false,
      })) as { setCronAnswer: boolean };

      if (setCronAnswer) {
        const { cron } = (await inquirer.prompt({
          message: 'cron: ',
          type: 'input',
          name: 'cron',
        })) as { cron: string };
        return cron.split(',').map((value) => value.trim());
      }
    }
  }
  async promptHealthCheck(): Promise<IHealthConfig | undefined> {
    const { setHealtCheckAnswer } = (await inquirer.prompt({
      message: 'Configure healthcheck? (Default: No)',
      type: 'confirm',
      name: 'setHealtCheckAnswer',
      default: false,
    })) as { setHealtCheckAnswer: boolean };

    if (setHealtCheckAnswer) {
      const healthcheckConfigs = (await inquirer.prompt([
        {
          message: 'command: ',
          type: 'input',
          name: 'command',
        },
        {
          message: 'interval(ms): ',
          type: 'input',
          name: 'interval',
        },
        {
          message: 'timeout(ms): ',
          type: 'input',
          name: 'timeout',
        },
        {
          message: 'retries: ',
          type: 'input',
          name: 'retries',
        },
        {
          message: 'startPeriod(ms): ',
          type: 'input',
          name: 'startPeriod',
        },
      ])) as IHealthConfig;
      return healthcheckConfigs;
    }
  }
}
