import ora, { Ora } from 'ora';
import path from 'node:path';
import chalk from 'chalk';
import bytes from 'bytes';
import fs from 'fs-extra';
import moment from 'moment';
import inquirer from 'inquirer';
import ProgressBar from 'progress';
import { Flags, Errors } from '@oclif/core';

import Logs from './app/logs.js';
import Command from '../base.js';
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
import buildArgsParser from '../utils/build-args-parser.js';
import { DEV_MODE, MAX_SOURCE_SIZE } from '../constants.js';
import DeployException from '../errors/deploy-exception.js';
import IDeploymentConfig from '../types/deployment-config.js';
import { getPort, getDefaultPort } from '../utils/get-port.js';
import cancelDeployment from '../services/cancel-deployment.js';
import CreateArchiveException from '../errors/create-archive.js';
import IGetProjectsResponse from '../types/get-project-response.js';
import ReachedMaxSourceSizeError from '../errors/max-source-size.js';
import mergePlatformConfigWithDefaults from '../utils/merge-platform-config.js';

export default class Deploy extends Command {
  static description = 'deploy an app';

  static flags = {
    ...Command.flags,
    path: Flags.string({ description: 'app path in your computer' }),
    platform: Flags.string({
      description: 'the platform your app needs to run',
    }),
    app: Flags.string({ char: 'a', description: 'app id' }),
    port: Flags.integer({
      char: 'p',
      description: 'the port that your app listens to',
    }),
    image: Flags.string({ char: 'i', description: 'docker image to deploy' }),
    detach: Flags.boolean({
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
      `Using Build Cache: ${config.buildCache ? 'Enabled' : 'Disabled'}`
    );

    config.dockerfile = config.dockerfile || config.build?.dockerfile;
    if (config.dockerfile) {
      this.debug(`Using Custom Dockerfile: ${config.dockerfile}`);
    }

    if (
      Array.isArray(config.build?.args) ||
      Array.isArray(config['build-arg'])
    ) {
      const FirstPriority = buildArgsParser(config['build-arg'] || []);
      const SecPriority = buildArgsParser(config.build?.args || []);

      // @ts-ignore
      config['build-arg'] = { ...secondPriority, ...firstPriority };
    }

    try {
      const response = await this.deploy(config);

      !config.image && (await this.showBuildLogs(response.releaseID));
      config.image && (await this.showReleaseLogs(response.releaseID));

      this.log();
      this.log(chalk.green('Deployment finished successfully.'));
      this.log(chalk.white('Open up the url below in your browser:'));
      this.log();

      const defaultSubdomain: string =
        config.region === 'iran' ? '.iran.liara.run' : '.liara.run';
      const urlLogMessage = DEV_MODE
        ? // tslint:disable-next-line: no-http-string
          `    ${chalk.cyan(`http://${config.app}.liara.localhost`)}`
        : `    ${chalk.cyan(`https://${config.app}${defaultSubdomain}`)}`;
      this.log(urlLogMessage);

      this.log();

      if (flags.detach) {
        process.exit(0);
      }

      this.log('Reading app logs...');
      await Logs.run([
        '--app',
        config.app,
        '--since',
        moment().unix().toString(),
        '--follow',
        '--timestamps',
        '--colorize',
        '--api-token',
        config['api-token'] || '',
        '--region',
        config.region || '',
      ]);
    } catch (error) {
      this.log();
      this.spinner.stop();
      error.response && debug(error.response.body);
      !error.response && debug(error);

      const responseBody =
        error.response &&
        error.response.statusCode >= 400 &&
        error.response.statusCode < 500
          ? JSON.parse(error.response.body)
          : {};

      if (error.message === 'TIMEOUT') {
        this.error('Build timed out. It took about 10 minutes.');
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
            config.region!
          )}`).render()
        );
        process.exit(2);
      }

      if (error instanceof CreateArchiveException) {
        return this.error(error.message);
      }

      if (error instanceof ReachedMaxSourceSizeError) {
        this.error(
          `Source is too large. ${chalk.yellowBright('(max: 256MB)')}`
        );
      }

      this.log(chalk.gray(this.config.userAgent));
      this.log();
      this.error(`Deployment failed.
Sorry for inconvenience. If you think it's a bug, please contact us.
To file a ticket, please head to: https://console.liara.ir/tickets`);
    }
  }

  async deploy(config: IDeploymentConfig) {
    const body: { [k: string]: any } = {
      build: {
        cache: config.buildCache,
        args: config['build-arg'],
        dockerfile: config.dockerfile,
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
    body.platformConfig = await mergePlatformConfigWithDefaults(
      config.path,
      // @ts-ignore
      config.platform,
      // @ts-ignore
      config[config.platform] || {},
      this.debug
    );

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
        '(use .gitignore to reduce the size)'
      )}`
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
      sourceSize
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
    this.spinner.start('Building...');

    let isCanceled = false;

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
        if (output.state === 'DEPLOYING') {
          this.spinner.succeed('Image pushed.');
          this.spinner.start('Creating a new release...');
        }

        if (output.state === 'BUILDING' && output.line) {
          this.spinner.clear().frame();
          process.stdout.write(output.line);
        }

        if (output.state === 'PUSHING') {
          this.spinner.succeed('Build finished.');
          this.spinner.start('Pushing the image...');
          removeInterupListener();
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
        throw new Error('Release failed.');
      }

      this.debug(error.stack);
    }
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
                new DeployException(this.parseFailReason(release.failReason))
              );
            }

            return reject(new Error('Release failed.'));
          }

          if (release.state === 'READY') {
            this.spinner.succeed('Release created.');
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
        '`command` field in healthCheck must be either an array or a string.'
      );
    }

    if (config.build?.cache && typeof config.build.cache !== 'boolean') {
      this.error('`cache` parameter field must be a boolean.');
    }
  }

  async promptProject(): Promise<string> {
    this.spinner.start('Loading...\n');

    try {
      const { projects } = await this.got(
        'v1/projects'
      ).json<IGetProjectsResponse>();
      this.spinner.stop();

      if (!projects.length) {
        this.warn(
          'Please go to https://console.liara.ir/apps and create an app, first.'
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
      } catch {
        this.error('Syntax error in `liara.json`!');
      }
    }

    return content || {};
  }

  validatePlatform(platform: string, projectPath: string): void {
    if (platform === 'node') {
      const packageJSON = fs.readJSONSync(
        path.join(projectPath, 'package.json')
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
    sourceSize: number
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
