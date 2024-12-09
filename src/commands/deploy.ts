import path from 'node:path';

import fs from 'fs-extra';
import chalk from 'chalk';
import bytes from 'bytes';
import moment from 'moment';
import ora, { Ora } from 'ora';
import inquirer from 'inquirer';
import ProgressBar from 'progress';
import { Flags, Errors } from '@oclif/core';

import Command, {
  IGetDomainsResponse,
  IProjectDetailsResponse,
} from '../base.js';

import Logs from './app/logs.js';
import IFlags from '../types/flags.js';
import Poller from '../utils/poller.js';
import upload from '../services/upload.js';
import IRelease from '../types/release.js';
import checkPath from '../utils/check-path.js';
import onInterupt from '../utils/on-intrupt.js';
import ILiaraJSON from '../types/liara-json.js';
import buildLogs from '../services/build-logs.js';
import BuildFailed from '../errors/build-failed.js';
import validatePort from '../utils/validate-port.js';
import BuildCanceled from '../errors/build-cancel.js';
import BuildTimeout from '../errors/build-timeout.js';
import { createDebugLogger } from '../utils/output.js';
import createArchive from '../utils/create-archive.js';
import ReleaseFailed from '../errors/release-failed.js';
import prepareTmpDirectory from '../services/tmp-dir.js';
import detectPlatform from '../utils/detect-platform.js';
import collectGitInfo from '../utils/collect-git-info.js';
import ICreatedRelease from '../types/created-release.js';
import { BundlePlanError } from '../errors/bundle-plan.js';
import buildArgsParser from '../utils/build-args-parser.js';
import { DEV_MODE, MAX_SOURCE_SIZE } from '../constants.js';
import DeployException from '../errors/deploy-exception.js';
import IDeploymentConfig from '../types/deployment-config.js';
import { getPort, getDefaultPort } from '../utils/get-port.js';
import cancelDeployment from '../services/cancel-deployment.js';
import CreateArchiveException from '../errors/create-archive.js';
import IGetProjectsResponse from '../types/get-project-response.js';
import ReachedMaxSourceSizeError from '../errors/max-source-size.js';
import getPlatformVersion from '../services/get-platform-version.js';

export default class Deploy extends Command {
  static description = 'deploy an app';

  static flags = {
    ...Command.flags,
    path: Flags.string({ description: 'app path in your computer' }),
    platform: Flags.string({
      description: 'the platform your app needs to run',
    }),
    app: Flags.string({
      char: 'a',
      description: 'app id',
      parse: async (app) => app.toLowerCase(),
    }),
    port: Flags.integer({
      char: 'p',
      description: 'the port that your app listens to',
    }),
    image: Flags.string({ char: 'i', description: 'docker image to deploy' }),
    detach: Flags.boolean({
      description: 'run build in background',
      default: false,
    }),
    'no-app-logs': Flags.boolean({
      description: 'do not stream app logs after deployment',
      default: false,
    }),
    args: Flags.string({
      description: 'docker image entrypoint args',
    }),
    'build-arg': Flags.string({
      description: 'docker image build args',
      multiple: true,
    }),
    message: Flags.string({ char: 'm', description: 'the release message' }),
    disks: Flags.string({
      char: 'd',
      description: 'mount a disk',
      multiple: true,
    }),
    'no-cache': Flags.boolean({
      description: 'do not use cache when building the image',
    }),
    dockerfile: Flags.string({
      char: 'f',
      description: 'name of the Dockerfile (default is "PATH/Dockerfile")',
    }),
    'build-location': Flags.string({
      char: 'b',
      description: `name of the build's location`,
      options: ['iran', 'germany'],
    }),
  };

  spinner!: Ora;

  async run() {
    const { flags } = await this.parse(Deploy);

    const config: IDeploymentConfig = this.getMergedConfig(flags);

    const debug = createDebugLogger(flags.debug);
    this.debug = debug;
    this.spinner = ora();

    if (!config.image) {
      try {
        checkPath(config.path);
      } catch (error) {
        this.error(error.message);
      }

      this.dontDeployEmptyProjects(config.path);
    }

    await this.setGotConfig(config);

    this.validateDeploymentConfig(config);

    let isPlatformDetected = false;
    if (!config.image) {
      if (!config.platform) {
        try {
          config.platform = detectPlatform(config.path);
          isPlatformDetected = true;
        } catch (error) {
          return this.error(error.message);
        }
      }

      this.validatePlatform(config.platform, config.path);
    } else {
      config.platform = 'docker';
    }

    if (!config.app) {
      config.app = await this.promptProject();
    }

    if (!config.port) {
      config.port =
        getPort(config.platform) || (await this.promptPort(config.platform));
    }

    this.logKeyValue('App', config.app);
    this.logKeyValue('Path', config.path);
    isPlatformDetected
      ? this.logKeyValue('Detected platform', config.platform)
      : this.logKeyValue('Platform', config.platform);
    this.logKeyValue('Port', String(config.port));

    if (config.disks) {
      this.logKeyValue('Disks');
      for (const disk of config.disks) {
        console.log(`  ${disk.name} ${chalk.blue('->')} ${disk.mountTo}`);
      }
    }

    config.buildCache = !(config['no-cache'] || config.build?.cache === false);

    this.debug(
      `Using Build Cache: ${config.buildCache ? 'Enabled' : 'Disabled'}`,
    );

    config.dockerfile = config.dockerfile || config.build?.dockerfile;
    if (config.dockerfile) {
      this.debug(`Using Custom Dockerfile: ${config.dockerfile}`);
    }

    config['build-location'] =
      config['build-location'] || config.build?.location;
    if (config['build-location']) {
      this.debug(`Declared build location: ${config['build-location']}`);
    }

    const buildArgs = config.build?.args || config['build-arg'];

    if (Array.isArray(buildArgs)) {
      const firstPriority = buildArgsParser(config['build-arg'] || []);
      const secondPriority = buildArgsParser(config.build?.args || []);

      // @ts-ignore
      config['build-arg'] = { ...secondPriority, ...firstPriority };
    }

    let bundlePlanID: string;
    try {
      const { project } = await this.got(
        `v1/projects/${config.app}`,
      ).json<IProjectDetailsResponse>();
      bundlePlanID = project.bundlePlanID;

      const response = await this.deploy(config);

      if (flags.detach) {
        this.log(chalk.green('Deployment created successfully.'));
      } else {
        !config.image && (await this.showBuildLogs(response.releaseID));
        config.image && (await this.showReleaseLogs(response.releaseID));

        this.log();
        this.log(chalk.green('Deployment finished successfully.'));
        this.log(chalk.white('Open up the url below in your browser:'));
        this.log();

        const defaultSubdomain: string =
          config.region === 'iran' && !Boolean(project.network)
            ? '.iran.liara.run'
            : '.liara.run';
        const urlLogMessage = DEV_MODE
          ? // tslint:disable-next-line: no-http-string
            `    ${`http://${config.app}.liara.localhost`}`
          : `    ${`https://${config.app}${defaultSubdomain}`}`;

        const { domains } = await this.got(
          `v1/domains?project=${config.app}`,
        ).json<IGetDomainsResponse>();

        if (!domains.length || project.defaultSubdomain)
          this.log(urlLogMessage);

        const firstFiveDomains = domains.reverse().slice(0, 5);

        for (const domain of firstFiveDomains) {
          const protocol: string =
            domain.certificatesStatus === 'ACTIVE' ? 'https' : 'http';

          this.log(chalk.white(`    ${protocol}://${domain.name}`));
        }

        this.log();

        if (flags['no-app-logs']) {
          process.exit(0);
        }

        this.log('Reading app logs...');
        await Logs.run([
          '--app',
          config.app,
          '--since',
          '10s ago',
          '--follow',
          '--timestamps',
          '--colorize',
          '--api-token',
          config['api-token'] || '',
          '--region',
          config.region || '',
        ]);
      }
    } catch (error) {
      this.log();
      this.spinner.stop();
      error.response && debug(error.response.body);
      !error.response && debug(error);
      const responseBody =
        error.response &&
        error.response.statusCode >= 400 &&
        error.response.statusCode < 500
          ? JSON.parse(error.response.body || '{}')
          : {};

      if (error.message === 'TIMEOUT') {
        this.error('Build timed out. It took about 20 minutes.');
      }

      if (
        error.response &&
        error.response.statusCode === 404 &&
        responseBody.message === 'project_not_found'
      ) {
        const message = `App does not exist.
Please open up https://console.liara.ir/apps and create the app, first.`;
        return this.error(message);
      }

      if (
        error.response &&
        error.response.statusCode === 400 &&
        responseBody.message === 'frozen_project'
      ) {
        const message = `App is frozen (not enough balance).
Please open up https://console.liara.ir/apps and unfreeze the app.`;
        return this.error(message);
      }

      if (error.response && error.response.statusCode === 408) {
        const message =
          "Oops! It seems like there's a disruption, and the request has timed out (Error 408). Please check your internet connection and try again.";

        return this.error(message);
      }

      if (
        error.response &&
        error.response.statusCode === 428 &&
        responseBody?.data?.code === 'max_deployment_count_in_day'
      ) {
        return this.error(
          BundlePlanError.max_deploy_per_day(bundlePlanID!) ||
            `You have reached the maximum number of deployments for today. Please try again tomorrow.`,
        );
      }

      if (
        error.response &&
        error.response.statusCode === 428 &&
        responseBody?.data?.code === 'germany_builder_not_allowed'
      ) {
        const message = `To use builder locations, upgrade your feature bundle plan, first. 
Then try again.
https://console.liara.ir/apps/${config.app}/resize`;

        return this.error(
          BundlePlanError.germany_builder_not_allowed(bundlePlanID!) || message,
        );
      }

      if (
        error.response &&
        error.response.statusCode >= 400 &&
        error.response.statusCode < 500 &&
        responseBody.message
      ) {
        const message = `CODE ${error.response.statusCode}: ${responseBody.message}`;
        return this.error(message);
      }

      if (error.response && error.response.statusCode === 401) {
        // tslint:disable-next-line: no-console
        console.error(
          new Errors.CLIError(`Authentication failed.
Please login via 'liara login' command.

If you are using API token for authentication, please consider updating your API token.
You may also want to switch to another region. Your current region is: ${chalk.cyan(
            config.region!,
          )}`).render(),
        );
        process.exit(2);
      }

      if (error instanceof CreateArchiveException) {
        return this.error(error.message);
      }

      if (error instanceof ReleaseFailed) {
        return this.error(error.message);
      }

      if (
        error instanceof ReachedMaxSourceSizeError ||
        (error.response && error.response.statusCode === 413)
      ) {
        this.error(
          BundlePlanError.max_source_size(bundlePlanID!) || error.message,
        );
      }

      this.log(chalk.gray(this.config.userAgent));
      this.log();
      return this.error(`Deployment failed.
Additionally, you can also retry the build with the debug flag:
    $ ${chalk.cyan('liara deploy --debug')}`);
    }
  }

  async deploy(config: IDeploymentConfig) {
    let body: { [k: string]: any } = {
      build: {
        cache: config.buildCache,
        args: config['build-arg'],
        dockerfile: config.dockerfile,
        location: config['build-location'],
      },
      cron: config.cron,
      args: config.args,
      port: config.port,
      type: config.platform,
      message: config.message,
      disks: config.disks,
    };

    if (config.image) {
      body.image = config.image;
      return this.createRelease(config.app as string, body);
    }

    body.gitInfo = await collectGitInfo(config.path, this.debug);

    // @ts-ignore
    body.platformConfig = config[config.platform] || {};
    body = await this.__detectPlatformVersion(config, body);

    if (config.healthCheck) {
      body.healthCheck = config.healthCheck;

      if (typeof config.healthCheck.command === 'string') {
        body.healthCheck.command = config.healthCheck.command.split(' ');
      }
    }

    this.spinner.start('Creating an archive...');

    const sourcePath = prepareTmpDirectory();
    try {
      await createArchive(sourcePath, config.path, config.platform, this.debug);
    } finally {
      this.spinner.stop();
    }

    const { size: sourceSize } = fs.statSync(sourcePath);

    this.logKeyValue(
      'Compressed size',
      `${bytes(sourceSize)} ${chalk.cyanBright(
        '(use .gitignore to reduce the size)',
      )}`,
    );

    if (sourceSize > MAX_SOURCE_SIZE) {
      try {
        fs.removeSync(sourcePath);
      } catch (error) {
        this.debug(error.stack);
      } finally {
        // eslint-disable-next-line no-unsafe-finally
        throw new ReachedMaxSourceSizeError();
      }
    }

    const sourceID = await this.upload(
      config.app as string,
      sourcePath,
      sourceSize,
    );

    this.debug(`sourceID: ${sourceID}`);

    body.sourceID = sourceID;
    return this.createRelease(config.app as string, body);
  }

  createRelease(project: string, body: { [k: string]: any }) {
    return this.got
      .post(`v2/projects/${project}/releases`, { json: body })
      .json<ICreatedRelease>();
  }

  async showBuildLogs(releaseID: string) {
    while (true) {
      try {
        const { release } = await this.got(`v1/releases/${releaseID}`).json<{
          release: IRelease;
        }>();

        if (!release.queue) {
          break;
        }

        this.spinner.start(
          `Waiting for the build, ${release.queue} people(s) ahead...`,
        );

        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        // tslint:disable-next-line: no-console
        console.error(error.output.line);
        throw new Error('Build failed.');
      }
    }

    this.spinner.start('Building...');

    let isCanceled = false;
    let isPushingStart = false;

    const removeInterupListener = onInterupt(async () => {
      // Force close
      if (isCanceled) process.exit(3);

      this.spinner.start('\nCanceling the build...');
      isCanceled = true;

      const retryOptions = {
        retries: 3,
        onRetry: (error: any, attempt: number) => {
          this.debug(error.stack);
          this.log(`${attempt}: Could not cancel, retrying...`);
        },
      };
      await cancelDeployment(this.got, releaseID, retryOptions);
      this.spinner.warn('Build canceled.');
      process.exit(3);
    });

    try {
      await buildLogs(this.got, releaseID, isCanceled, (output) => {
        if (output.state === 'PUSHED') {
          this.spinner.succeed('Image pushed.');
        }

        if (output.state === 'DEPLOYING') {
          this.spinner.start("Checking container's health ...");
        }

        if (output.state === 'UNHEALTHY') {
          this.spinner.warn(
            'App deployed, but the container is unhealthy. Please check its logs.',
          );
        }

        if (output.state === 'BUILDING' && output.line) {
          this.spinner.clear().frame();
          process.stdout.write(output.line);
        }

        if (output.state === 'PUSHING') {
          if (!isPushingStart) {
            removeInterupListener();
            this.spinner.succeed('Build finished.');
            isPushingStart = !isPushingStart;
          }
          if (output.line) {
            this.spinner.clear().frame();
            this.spinner.start(output.line);
          }
        }
      });
      this.spinner.succeed('Release created.');
    } catch (error) {
      if (error instanceof BuildFailed) {
        // tslint:disable-next-line: no-console
        console.error(error.output.line);
        throw new Error('Build failed.');
      }

      if (error instanceof BuildCanceled) {
        this.spinner.warn('Build canceled.');
        process.exit(3);
      }

      if (error instanceof BuildTimeout) {
        this.spinner.fail();
        throw new Error('TIMEOUT');
      }

      if (error instanceof DeployException) {
        this.spinner.fail();
        throw new Error(this.parseFailReason(error.message));
      }

      if (error instanceof ReleaseFailed) {
        this.spinner.fail();
        this.error('Release failed.');
      }

      this.debug(error.stack);
    }
  }

  async __detectPlatformVersion(config: any, body: any) {
    if (body.platformConfig.pythonVersion) {
      // django, flask
      this.logKeyValue('Python version', body.platformConfig.pythonVersion);
      return body;
    }
    if (body.platformConfig.version) {
      // node, dotnet, php, python, go
      this.logKeyValue(
        `${config.platform} version`,
        body.platformConfig.version,
      );
      return body;
    }
    if (body.platformConfig.phpVersion) {
      // laravel
      this.logKeyValue('PHP version', body.platformConfig.phpVersion);
      return body;
    } else {
      this.debug('No version specified in liara.json');

      this.debug('Auto-detecting version...');
      let platformVersion: string | null = null;
      switch (config.platform) {
        case 'django':
        case 'flask':
          platformVersion = await getPlatformVersion(
            config.platform,
            config.path,
            this.debug,
          );
          if (platformVersion) {
            this.logKeyValue('Auto-detected Python version', platformVersion);
            body.platformConfig.pythonVersion = platformVersion;
          }
          break;
        case 'php':
        case 'laravel':
          platformVersion = await getPlatformVersion(
            config.platform,
            config.path,
            this.debug,
          );
          if (platformVersion) {
            this.logKeyValue('Auto-detected php version', platformVersion);
            if (config.platform === 'php') {
              body.platformConfig.version = platformVersion;
            } else {
              body.platformConfig.phpVersion = platformVersion;
            }
          }
          break;
        case 'python':
        case 'node':
        case 'dotnet':
        case 'go':
          platformVersion = await getPlatformVersion(
            config.platform,
            config.path,
            this.debug,
          );
          if (platformVersion) {
            this.logKeyValue(
              `Auto-detected ${config.platform} version`,
              platformVersion,
            );
            body.platformConfig.version = platformVersion;
          }
          break;

        default:
          this.debug(
            `Can not auto-detect version for ${config.platform} platform`,
          );
          break;
      }
      if (!platformVersion) {
        this.debug('No version for this platform found. Using default version');
      }
    }

    return body;
  }

  async showReleaseLogs(releaseID: string) {
    this.spinner.start('Creating a new release...');

    return new Promise<void>((resolve, reject) => {
      const poller = new Poller();

      poller.onPoll(async () => {
        try {
          const { release } = await this.got(`v1/releases/${releaseID}`).json<{
            release: IRelease;
          }>();

          if (release.state === 'FAILED') {
            this.spinner.fail();
            if (release.failReason) {
              return reject(
                new DeployException(this.parseFailReason(release.failReason)),
              );
            }

            return reject(new Error('Release failed.'));
          } else if (release.state === 'UNHEALTHY') {
            this.spinner.warn(
              'App deployed, but the container is unhealthy. Please check its logs.',
            );
            return reject(
              new ReleaseFailed(
                'Release is not healthy. Check logs from web panel',
              ),
            );
          } else if (release.state === 'READY') {
            this.spinner.succeed('Release is healthy.');
            return resolve();
          }
        } catch (error) {
          this.debug(error.stack);
        }

        poller.poll();
      });

      poller.poll();
    });
  }

  parseFailReason(reason: string) {
    const [errorName, ...data] = reason.split(' ');

    if (errorName === 'disk_not_found') {
      return `Could not find disk \`${data[0]}\`.`;
    }

    return reason;
  }

  dontDeployEmptyProjects(projectPath: string) {
    if (fs.readdirSync(projectPath).length === 0) {
      this.error('Directory is empty!');
    }
  }

  logKeyValue(key: string, value = ''): void {
    this.spinner.clear().frame();
    this.log(`${chalk.blue(`${key}:`)} ${value}`);
  }

  validateDeploymentConfig(config: IDeploymentConfig) {
    if (config.healthCheck && !config.healthCheck.command) {
      this.error('`command` field in healthCheck is required.');
    }

    if (
      config.healthCheck &&
      typeof config.healthCheck.command !== 'string' &&
      !Array.isArray(config.healthCheck.command)
    ) {
      this.error(
        '`command` field in healthCheck must be either an array or a string.',
      );
    }

    if (config.build?.cache && typeof config.build.cache !== 'boolean') {
      this.error('`cache` parameter field must be a boolean.');
    }
  }

  async promptProject(): Promise<string> {
    this.spinner.start('Loading...\n');

    try {
      const { projects } =
        await this.got('v1/projects').json<IGetProjectsResponse>();
      this.spinner.stop();

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
      this.spinner.stop();
      throw error;
    }
  }

  async promptPort(platform: string): Promise<number> {
    const { port } = (await inquirer.prompt({
      name: 'port',
      type: 'input',
      default: getDefaultPort(platform),
      message: 'Enter the port your app listens to:',
      validate: validatePort,
    })) as { port: number };

    return port;
  }

  getMergedConfig(flags: IFlags): IDeploymentConfig {
    const defaults = {
      path: flags.path ? flags.path : process.cwd(),
    };
    const projectConfig = this.readProjectConfig(defaults.path);

    const disks = flags.disks
      ? flags.disks.map((el) => {
          const [name, mountTo] = el.toString().split(':');
          return { name, mountTo };
        })
      : projectConfig.disks;

    const args = flags.args ? flags.args.split(' ') : projectConfig.args;

    return {
      ...defaults,
      ...projectConfig,
      ...flags,
      disks,
      args,
    };
  }

  readProjectConfig(projectPath: string): ILiaraJSON {
    let content;

    const liaraJSONPath = path.join(projectPath, 'liara.json');

    const hasLiaraJSONFile = fs.existsSync(liaraJSONPath);

    if (hasLiaraJSONFile) {
      try {
        content = fs.readJSONSync(liaraJSONPath) || {};

        content.app && (content.app = content.app.toLowerCase());
      } catch (error) {
        content = {};
        this.error('Syntax error in `liara.json`!', error);
      }
    }

    return content || {};
  }

  validatePlatform(platform: string, projectPath: string): void {
    if (platform === 'node') {
      const packageJSON = fs.readJSONSync(
        path.join(projectPath, 'package.json'),
      );

      if (!packageJSON.scripts || !packageJSON.scripts.start) {
        this.error(`A NodeJS app must be runnable with 'npm start'.
You must add a 'start' command to your package.json scripts.`);
      }
    }
  }

  async upload(
    project: string,
    sourcePath: string,
    sourceSize: number,
  ): Promise<string> {
    const bar = new ProgressBar('Uploading [:bar] :percent :etas', {
      total: sourceSize,
      width: 20,
      complete: '=',
      incomplete: '',
      clear: true,
    });

    const onProgress = (progress: { transferred: number }) => {
      bar.tick(progress.transferred - bar.curr);
    };

    try {
      const response = await upload(project, this.got, sourcePath)
        .on('uploadProgress', onProgress)
        .json<{ sourceID: string }>();

      this.spinner.succeed('Upload finished.');
      this.debug(`source upload response: ${JSON.stringify(response)}`);
      return response.sourceID;
    } catch (error) {
      this.spinner.fail('Upload failed.');
      throw error;
    } finally {
      // cleanup
      fs.unlink(sourcePath).catch(() => {});
    }
  }
}
