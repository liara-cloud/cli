import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Flags } from '@oclif/core';

import Command, { IProject } from '../base.js';
import { getPort } from '../utils/get-port.js';
import ILiaraJSON from '../types/liara-json.js';
import { promptPort } from '../utils/prompt-port.js';
import { AVAILABLE_PLATFORMS } from '../constants.js';
import IHealthConfig from '../types/health-config.js';
import detectPlatform from '../utils/detect-platform.js';
import supportedVersions from '../utils/get-supported-versions.js';
import IGetProjectsResponse from '../types/get-project-response.js';
import { IDisk, IGetDiskResponse } from '../types/get-disk-response.js';
import IGetTeamsResponse from '../types/get-teams.js';
import ITeam from '../types/team.js';
import TeamNotFoundError from '../errors/team-error.js';

type DiskConfig = { disk: string; path: string };

export default class Init extends Command {
  static description = 'create a liara.json file';
  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {
    ...Command.flags,
    y: Flags.boolean({
      char: 'y',
      description: 'create an example file',
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

  private async handleError(error: unknown, fallbackMessage: string): Promise<never> {
    if (error instanceof TeamNotFoundError) {
      throw error;
    }

    if (error instanceof Error && 'response' in error && error.response.statusCode === 401) {
      throw new Error(`Authentication failed.  
Please log in using the 'liara login' command.

If you are using an API token for authentication, please consider updating your API token.  
You can still create a sample 'liara.json' file using the 'liara init -y' command.`);
    }

    throw new Error(fallbackMessage);
  }

  public async run(): Promise<void> {
    try {
      const { flags } = await this.parse(Init);
      await this.setGotConfig(flags);

      this.showWelcomeMessage();

      if (flags.y) {
        await this.createExampleConfig();
        return;
      }

      const team = await this.getTeam(flags['team-id']);
      const projects = await this.getProjects();
      const appName = await this.promptProjectName(projects, flags.name);
      const buildLocation = await this.promptBuildLocation(flags['build-location']);
      const platform = await this.determinePlatform(projects, appName, flags.platform);
      const port = await this.determinePort(platform, flags.port, projects);
      const version = await this.promptPlatformVersion(platform, flags.version);
      const disks = await this.getAppDisks(appName, projects);
      const diskConfigs = await this.promptDiskConfig(disks, flags.disk, flags.path);
      const cron = await this.promptCron(platform);
      const healthCheck = await this.promptHealthCheck();

      const configs = this.buildConfigObject(
        port,
        appName,
        buildLocation,
        platform,
        version,
        diskConfigs,
        healthCheck,
        cron,
        team
      );

      await this.createLiaraJsonFile(configs);
    } catch (error) {
      this.spinner?.stop();
      throw error;
    }
  }

  private showWelcomeMessage(): void {
    this.log(chalk.yellow(`This command interactively creates a basic liara.json configuration file.
It includes only the essential settings; additional configurations must be added manually.
📚 For more details on each field and its usage, visit: https://docs.liara.ir/paas/liarajson/.

Afterwards, use liara deploy to deploy your app.

🔑 Press ^C at any time to quit.`));
  }

  private async createExampleConfig(): Promise<void> {
    try {
      const dirName = path.basename(process.cwd());
      const platform = detectPlatform(process.cwd());
      const configs = this.buildConfigObject(
        getPort(platform) || 3000,
        dirName,
        'iran',
        platform,
        supportedVersions(platform)?.defaultVersion
      );
      await this.createLiaraJsonFile(configs);
    } catch (error) {
      this.spinner?.stop();
      throw error;
    }
  }

  private async getProjects(): Promise<IProject[]> {
    this.spinner = ora('Loading...').start();
    
    try {
      const { projects } = await this.got('v1/projects').json<IGetProjectsResponse>();
      this.spinner?.stop();
      return projects as IProject[];
    } catch (error) {
      this.spinner?.stop();
      return this.handleError(error, `There was something wrong while fetching your apps,
        You can still use 'liara init' with its flags. Use 'liara init --help' for more details.`);
    }
  }

  private async promptProjectName(
    projects: IProject[],
    flagValue?: string
  ): Promise<string> {
    if (flagValue) return flagValue;

    if (projects.length === 0) {
      const { project } = await inquirer.prompt<{ project: string }>({
        name: 'project',
        type: 'input',
        message: 'Enter app name:',
      });
      return project;
    }

    const { project } = await inquirer.prompt<{ project: string }>({
      name: 'project',
      type: 'list',
      message: 'Select an app:',
      choices: projects.map(p => p.project_id),
    });
    return project;
  }

  private async determinePlatform(
    projects: IProject[],
    appName: string,
    flagValue?: string
  ): Promise<string> {
    if (flagValue) return flagValue;
    if (projects.length === 0) return this.promptPlatform();

    const project = projects.find(p => p.project_id === appName);
    return project?.type || 'static';
  }

  private async determinatePort(
    platform: string,
    flagValue?: number,
    projects?: IProject[]
  ): Promise<number> {
    if (flagValue) return flagValue;
    
    const defaultPort = getPort(platform);
    return defaultPort ?? promptPort(platform);
  }

  private async promptBuildLocation(flagValue?: string): Promise<string> {
    if (flagValue) return flagValue;

    const { location } = await inquirer.prompt<{ location: string }>({
      message: 'Specify the build location: ',
      name: 'location',
      type: 'list',
      default: 'iran',
      choices: ['iran', 'germany'],
    });
    return location;
  }

  private async promptPlatformVersion(
    platform: string,
    flagValue?: string
  ): Promise<string | undefined> {
    if (flagValue) return flagValue;

    const versions = supportedVersions(platform);
    if (!versions) return undefined;

    const messages: Record<string, string> = {
      flask: 'Select python version',
      django: 'Select python version',
      laravel: 'Select php version',
      next: 'Select node version',
    };

    const { version } = await inquirer.prompt<{ version: string }>({
      message: messages[platform] || `Select ${platform} version:`,
      name: 'version',
      type: 'list',
      default: versions.defaultVersion,
      choices: versions.allVersions,
    });
    return version;
  }

  private async createLiaraJsonFile(configs: ILiaraJSON): Promise<void> {
    this.spinner = ora('Loading...').start();
    
    try {
      await fs.writeJson(`${process.cwd()}/liara.json`, configs, { spaces: 2 });
      this.spinner?.succeed('liara.json is successfully created!');
    } catch (error) {
      this.spinner?.stop();
      throw new Error('There was a problem while creating liara.json!');
    }
  }

  private buildConfigObject(
    port: number,
    appName: string,
    buildLocation: string,
    platform: string,
    platformVersion?: string,
    diskConfigs?: DiskConfig[],
    healthCheck?: IHealthConfig,
    cron?: string[],
    team?: ITeam
  ): ILiaraJSON {
    const versionKey = this.getVersionKey(platform, platformVersion);
    const config: ILiaraJSON = {
      port,
      platform,
      app: appName,
      build: { location: buildLocation },
    };

    if (team) config['team-id'] = team._id;
    if (cron) config.cron = cron;
    if (healthCheck) config.healthCheck = healthCheck;
    
    if (platformVersion && versionKey) {
      (config as Record<string, any>)[platform] = { [versionKey]: platformVersion };
    }

    if (diskConfigs) {
      config.disks = diskConfigs.map(({ disk, path }) => ({ name: disk, mountTo: path }));
    }

    return config;
  }

  private getVersionKey(platform: string, version?: string): string | undefined {
    if (!version) return undefined;

    const versionKeys: Record<string, string> = {
      flask: 'pythonVersion',
      django: 'pythonVersion',
      laravel: 'phpVersion',
      next: 'nodeVersion',
    };

    return versionKeys[platform] || 'version';
  }

  private async getTeam(teamId?: string): Promise<ITeam | undefined> {
    this.spinner = ora('Loading...').start();
    
    try {
      const { teams } = await this.got('v2/teams').json<IGetTeamsResponse>();
      this.spinner?.stop();

      if (teamId) {
        const team = teams.find(t => t._id === teamId);
        if (!team) throw new TeamNotFoundError(`You don't have a team with ID '${teamId}'`);
        return team;
      }
    } catch (error) {
      this.spinner?.stop();
      return this.handleError(error, 'Failed to fetch teams');
    }
  }

  private async getAppDisks(
    appName: string,
    projects: IProject[]
  ): Promise<IDisk[] | undefined> {
    if (projects.length === 0) return undefined;

    this.spinner = ora('Loading...').start();
    
    try {
      const project = projects.find(p => p.project_id === appName);
      if (!project) return undefined;

      const { disks } = await this.got(`v1/projects/${project._id}/disks`).json<IGetDiskResponse>();
      this.spinner?.stop();
      return disks;
    } catch (error) {
      this.spinner?.stop();
      return this.handleError(error, `There was something wrong while fetching your app info,
         You can still use 'liara init' with it's flags. Use 'liara init --help' for command details.`);
    }
  }

  private async promptPlatform(): Promise<string> {
    const { platform } = await inquirer.prompt<{ platform: string }>({
      name: 'platform',
      type: 'list',
      message: 'Select a platform:',
      choices: [...AVAILABLE_PLATFORMS],
    });
    return platform;
  }

  private async promptDiskConfig(
    disks?: IDisk[],
    diskNameFlag?: string,
    diskPathFlag?: string
  ): Promise<DiskConfig[] | undefined> {
    if (diskNameFlag && diskPathFlag) {
      return [{ disk: diskNameFlag, path: diskPathFlag }];
    }

    const { setDisk } = await inquirer.prompt<{ setDisk: boolean }>({
      message: 'Configure disks? (Default: No)',
      type: 'confirm',
      name: 'setDisk',
      default: false,
    });

    if (!setDisk) return undefined;

    if (!disks?.length) {
      const { diskName, path } = await inquirer.prompt<{ diskName: string; path: string }>([
        {
          message: 'Enter Disk name: ',
          name: 'diskName',
          type: 'input',
        },
        {
          message: 'Specify the mount location: ',
          name: 'path',
          type: 'input',
        },
      ]);
      return [{ disk: diskName, path }];
    }

    const diskConfigs: DiskConfig[] = [];
    let remainingDisks = [...disks];

    while (remainingDisks.length > 0) {
      const { diskName } = await inquirer.prompt<{ diskName: string }>({
        message: 'Select a Disk: ',
        name: 'diskName',
        choices: remainingDisks,
        type: 'list',
      });

      const { path } = await inquirer.prompt<{ path: string }>({
        message: `Mount path for ${diskName}: `,
        name: 'path',
        type: 'input',
      });

      diskConfigs.push({ disk: diskName, path });
      remainingDisks = remainingDisks.filter(d => d.name !== diskName);

      if (remainingDisks.length > 0) {
        const { shouldContinue } = await inquirer.prompt<{ shouldContinue: boolean }>({
          message: 'Add another disk? (Default: No)',
          type: 'confirm',
          default: false,
          name: 'shouldContinue',
        });
        if (!shouldContinue) break;
      }
    }

    return diskConfigs;
  }

  private async promptCron(platform: string): Promise<string[] | undefined> {
    const supportedPlatforms = new Set(['next', 'laravel', 'django', 'php', 'python', 'flask', 'go']);
    if (!supportedPlatforms.has(platform)) return undefined;

    const { setCronAnswer } = await inquirer.prompt<{ setCronAnswer: boolean }>({
      message: 'Configure cron? (Default: No)',
      type: 'confirm',
      name: 'setCronAnswer',
      default: false,
    });

    if (!setCronAnswer) return undefined;

    const { cron } = await inquirer.prompt<{ cron: string }>({
      message: 'cron: ',
      type: 'input',
      name: 'cron',
    });

    return cron.split(',').map(v => v.trim());
  }

  private async promptHealthCheck(): Promise<IHealthConfig | undefined> {
    const { setHealtCheckAnswer } = await inquirer.prompt<{ setHealtCheckAnswer: boolean }>({
      message: 'Configure healthcheck? (Default: No)',
      type: 'confirm',
      name: 'setHealtCheckAnswer',
      default: false,
    });

    if (!setHealtCheckAnswer) return undefined;

    return inquirer.prompt<IHealthConfig>([
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
    ]);
  }
}
