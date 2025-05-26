import path from 'node:path';
import fs from 'fs-extra';
import chalk from 'chalk';
import bytes from 'bytes';
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
import { promptPort } from '../utils/prompt-port.js';
import BuildCanceled from '../errors/build-cancel.js';
import BuildTimeout from '../errors/build-timeout.js';
import { createDebugLogger } from '../utils/output.js';
import createArchive from '../utils/create-archive.js';
import ReleaseFailed from '../errors/release-failed.js';
import prepareTmpDirectory from '../services/tmp-dir.js';
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

type DeploymentState = 'BUILDING' | 'PUSHING' | 'PUSHED' | 'DEPLOYING' | 'UNHEALTHY';

export default class Deploy extends Command {
  static description = 'Deploy an application to Liara';

  static flags = {
    ...Command.flags,
    path: Flags.string({ description: 'Application directory path' }),
    platform: Flags.string({ description: 'Application platform/runtime' }),
    app: Flags.string({
      char: 'a',
      description: 'Application ID',
      parse: async (app) => app.toLowerCase(),
    }),
    port: Flags.integer({
      char: 'p',
      description: 'Port that your application listens to',
    }),
    image: Flags.string({ 
      char: 'i', 
      description: 'Pre-built Docker image to deploy' 
    }),
    detach: Flags.boolean({
      description: 'Run build in background without logs',
      default: false,
    }),
    'no-app-logs': Flags.boolean({
      description: 'Skip streaming application logs after deployment',
      default: false,
    }),
    args: Flags.string({ description: 'Docker image entrypoint arguments' }),
    'build-arg': Flags.string({
      description: 'Docker build arguments',
      multiple: true,
    }),
    message: Flags.string({ 
      char: 'm', 
      description: 'Release message/description' 
    }),
    disks: Flags.string({
      char: 'd',
      description: 'Mount a disk (format: name:mountPath)',
      multiple: true,
    }),
    'no-cache': Flags.boolean({
      description: 'Disable build cache',
    }),
    dockerfile: Flags.string({
      char: 'f',
      description: 'Custom Dockerfile path',
    }),
    'build-location': Flags.string({
      char: 'b',
      description: 'Build location/region',
      options: ['iran', 'germany'],
    }),
  };

  private spinner: Ora;
  private debug: (...args: any[]) => void;

  async run(): Promise<void> {
    const { flags } = await this.parse(Deploy);
    const config = this.getMergedConfig(flags);
    
    this.initializeDebugger(flags);
    this.validateInitialConfig(config);

    try {
      await this.executeDeployment(config);
    } catch (error) {
      await this.handleDeploymentError(error, config);
    }
  }

  private initializeDebugger(flags: IFlags): void {
    this.debug = createDebugLogger(flags.debug);
    this.spinner = ora();
  }

  private validateInitialConfig(config: IDeploymentConfig): void {
    if (!config.image) {
      checkPath(config.path);
      this.dontDeployEmptyProjects(config.path);
    }
  }

  private async executeDeployment(config: IDeploymentConfig): Promise<void> {
    await this.setGotConfig(config);
    this.validateDeploymentConfig(config);

    if (!config.app) {
      config.app = await this.promptProject();
    }

    this.logDeploymentConfiguration(config);

    const { project } = await this.fetchProjectDetails(config.app);
    const bundlePlanID = project.bundlePlanID;

    if (!config.image) {
      config.platform = await this.determinePlatform(config, project);
      config.port = await this.determinePort(config);
    } else {
      config.platform = 'docker';
    }

    const response = await this.deploy(config);

    if (config.detach) {
      this.log(chalk.green('Deployment created successfully.'));
      return;
    }

    await this.monitorDeployment(config, response.releaseID);
    await this.displayDeploymentResults(config, project);
  }

  private async fetchProjectDetails(appId: string): Promise<{ project: IProjectDetailsResponse['project'] }> {
    const response = await this.got(`v1/projects/${appId}`).json<IProjectDetailsResponse>();
    return { project: response.project };
  }

  private async determinePlatform(config: IDeploymentConfig, project: IProjectDetailsResponse['project']): Promise<string> {
    if (!config.platform) {
      try {
        return project.type;
      } catch (error) {
        this.error(error.message);
      }
    }
    this.validatePlatform(config.platform, config.path);
    return config.platform;
  }

  private async determinePort(config: IDeploymentConfig): Promise<number> {
    if (!config.port) {
      return getPort(config.platform) || await promptPort(config.platform);
    }
    validatePort(config.port);
    return config.port;
  }

  private logDeploymentConfiguration(config: IDeploymentConfig): void {
    this.logKeyValue('App', config.app);
    this.logKeyValue('Path', config.path);
    this.logKeyValue('Platform', config.platform);
    
    if (config.port) {
      this.logKeyValue('Port', String(config.port));
    }

    if (config.disks) {
      this.logKeyValue('Disks');
      config.disks.forEach(disk => {
        console.log(`  ${disk.name} ${chalk.blue('->')} ${disk.mountTo}`);
      });
    }

    this.debug(`Build Cache: ${config.buildCache ? 'Enabled' : 'Disabled'}`);
    
    if (config.dockerfile) {
      this.debug(`Using Custom Dockerfile: ${config.dockerfile}`);
    }

    if (config['build-location']) {
      this.debug(`Build Location: ${config['build-location']}`);
    }
  }

  private async monitorDeployment(config: IDeploymentConfig, releaseID: string): Promise<void> {
    if (!config.image) {
      await this.showBuildLogs(releaseID);
    } else {
      await this.showReleaseLogs(releaseID);
    }
  }

  private async displayDeploymentResults(config: IDeploymentConfig, project: IProjectDetailsResponse['project']): Promise<void> {
    this.log(chalk.green('\nDeployment finished successfully.'));
    this.log(chalk.white('Open up the URL below in your browser:\n'));

    const defaultSubdomain = config.region === 'iran' && !project.network 
      ? '.iran.liara.run' 
      : '.liara.run';

    const urlLogMessage = DEV_MODE
      ? `    http://${config.app}.liara.localhost`
      : `    https://${config.app}${defaultSubdomain}`;

    const { domains } = await this.got(`v1/domains?project=${config.app}`)
      .json<IGetDomainsResponse>();

    if (!domains.length || project.defaultSubdomain) {
      this.log(urlLogMessage);
    }

    domains.reverse().slice(0, 5).forEach(domain => {
      const protocol = domain.certificatesStatus === 'ACTIVE' ? 'https' : 'http';
      this.log(chalk.white(`    ${protocol}://${domain.name}`));
    });

    this.log();

    if (!config['no-app-logs']) {
      await this.streamApplicationLogs(config);
    }
  }

  private async streamApplicationLogs(config: IDeploymentConfig): Promise<void> {
    this.log('Reading app logs...');
    await Logs.run([
      '--app', config.app,
      '--since', '10s ago',
      '--follow',
      '--timestamps',
      '--colorize',
      '--api-token', config['api-token'] || '',
      '--team-id', config['team-id'] || '',
    ]);
  }

  private async handleDeploymentError(error: any, config: IDeploymentConfig): Promise<void> {
    this.spinner.stop();
    
    if (error.response) {
      this.debug(error.response.body);
      await this.handleApiError(error, config);
    } else {
      this.debug(error);
      await this.handleGenericError(error);
    }
  }

  private async handleApiError(error: any, config: IDeploymentConfig): Promise<void> {
    const statusCode = error.response.statusCode;
    const responseBody = statusCode >= 400 && statusCode < 500 
      ? JSON.parse(error.response.body || '{}') 
      : {};

    const errorHandlers = {
      404: () => this.handleNotFoundError(responseBody, config),
      400: () => this.handleBadRequestError(responseBody),
      408: () => this.error("Request timed out. Check your internet connection."),
      428: () => this.handlePreconditionError(responseBody, config),
      401: () => this.handleUnauthorizedError(config),
      413: () => this.error("Payload too large. Reduce your deployment size."),
    };

    if (errorHandlers[statusCode]) {
      return errorHandlers[statusCode]();
    }

    if (statusCode >= 400 && statusCode < 500 && responseBody.message) {
      return this.error(`CODE ${statusCode}: ${responseBody.message}`);
    }

    this.log(chalk.gray(this.config.userAgent));
    this.log();
    this.error(`Deployment failed. Retry with --debug for more details.`);
  }

  private handleNotFoundError(responseBody: any, config: IDeploymentConfig): void {
    if (responseBody.message === 'project_not_found') {
      this.error(`App does not exist. Create it at https://console.liara.ir/apps`);
    } else if (responseBody.message === 'Not Found') {
      this.error(`Project name conflicts with liara.json configuration.`);
    }
  }

  private handleBadRequestError(responseBody: any): void {
    if (responseBody.message === 'frozen_project') {
      this.error(`App is frozen due to insufficient balance.`);
    }
  }

  private handlePreconditionError(responseBody: any, config: IDeploymentConfig): void {
    const errorCode = responseBody?.data?.code;
    
    const preconditionErrors = {
      'max_deployment_count_in_day': BundlePlanError.max_deploy_per_day(config.bundlePlanID) ||
        'Maximum daily deployments reached. Try again tomorrow.',
      'germany_builder_not_allowed': BundlePlanError.germany_builder_not_allowed(config.bundlePlanID) ||
        `Upgrade your plan to use builder locations: https://console.liara.ir/apps/${config.app}/resize`,
    };

    if (preconditionErrors[errorCode]) {
      this.error(preconditionErrors[errorCode]);
    }
  }

  private handleUnauthorizedError(config: IDeploymentConfig): void {
    console.error(new Errors.CLIError(
      `Authentication failed. Run 'liara login' or update your API token.\nCurrent region: ${chalk.cyan(config.region!)}`
    ).render());
    process.exit(2);
  }

  private async handleGenericError(error: any): Promise<void> {
    const errorHandlers = {
      CreateArchiveException: () => this.error(error.message),
      ReleaseFailed: () => this.error(error.message),
      ReachedMaxSourceSizeError: () => this.error(error.message),
      BuildFailed: () => this.error('Build failed. Check logs for details.'),
      BuildTimeout: () => this.error('Build timed out after 20 minutes.'),
    };

    if (errorHandlers[error.constructor.name]) {
      return errorHandlers[error.constructor.name]();
    }

    this.error(`Deployment failed. Retry with --debug for details.`);
  }

  async deploy(config: IDeploymentConfig): Promise<ICreatedRelease> {
    const deploymentBody = await this.prepareDeploymentBody(config);
    
    if (config.image) {
      return this.createRelease(config.app as string, deploymentBody);
    }

    return this.deployFromSource(config, deploymentBody);
  }

  private async prepareDeploymentBody(config: IDeploymentConfig): Promise<Record<string, any>> {
    const body: Record<string, any> = {
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
      return body;
    }

    body.gitInfo = await collectGitInfo(config.path, this.debug);
    body.platformConfig = config[config.platform] || {};
    
    await this.detectPlatformVersion(config, body);

    if (config.healthCheck) {
      body.healthCheck = this.normalizeHealthCheck(config.healthCheck);
    }

    return body;
  }

  private normalizeHealthCheck(healthCheck: any): any {
    const normalized = { ...healthCheck };
    
    if (typeof healthCheck.command === 'string') {
      normalized.command = healthCheck.command.split(' ');
    }
    
    return normalized;
  }

  private async deployFromSource(config: IDeploymentConfig, body: Record<string, any>): Promise<ICreatedRelease> {
    this.spinner.start('Creating an archive...');
    
    const sourcePath = prepareTmpDirectory();
    try {
      await createArchive(sourcePath, config.path, config.platform, this.debug);
      this.spinner.stop();
      
      const { size: sourceSize } = fs.statSync(sourcePath);
      this.logKeyValue('Compressed size', this.formatSourceSize(sourceSize));
      
      this.validateSourceSize(sourceSize, sourcePath);
      
      const sourceID = await this.uploadSource(config.app as string, sourcePath, sourceSize);
      body.sourceID = sourceID;
      
      return this.createRelease(config.app as string, body);
    } finally {
      this.cleanupSourceArchive(sourcePath);
    }
  }

  private formatSourceSize(size: number): string {
    return `${bytes(size)} ${chalk.cyanBright('(use .gitignore to reduce size)')}`;
  }

  private validateSourceSize(size: number, sourcePath: string): void {
    if (size > MAX_SOURCE_SIZE) {
      fs.removeSync(sourcePath);
      throw new ReachedMaxSourceSizeError();
    }
  }

  private cleanupSourceArchive(sourcePath: string): void {
    try {
      fs.unlinkSync(sourcePath);
    } catch (error) {
      this.debug(`Failed to cleanup source archive: ${error}`);
    }
  }

  private async uploadSource(project: string, sourcePath: string, sourceSize: number): Promise<string> {
    const bar = new ProgressBar('Uploading [:bar] :percent :etas', {
      total: sourceSize,
      width: 20,
      complete: '=',
      incomplete: ' ',
      clear: true,
    });

    try {
      const response = await upload(project, this.got, sourcePath)
        .on('uploadProgress', progress => bar.tick(progress.transferred - bar.curr))
        .json<{ sourceID: string }>();

      this.spinner.succeed('Upload finished.');
      this.debug(`Upload response: ${JSON.stringify(response)}`);
      return response.sourceID;
    } catch (error) {
      this.spinner.fail('Upload failed.');
      throw error;
    }
  }

  async showBuildLogs(releaseID: string): Promise<void> {
    await this.waitForBuildQueue(releaseID);
    
    this.spinner.start('Building...');
    
    let isCanceled = false;
    const cleanup = onInterupt(() => this.handleBuildInterrupt(releaseID, isCanceled));

    try {
      await this.monitorBuildProgress(releaseID, isCanceled);
      this.spinner.succeed('Release created.');
    } finally {
      cleanup();
    }
  }

  private async waitForBuildQueue(releaseID: string): Promise<void> {
    while (true) {
      const { release } = await this.got(`v1/releases/${releaseID}`).json<{ release: IRelease }>();
      
      if (!release.queue) break;
      
      this.spinner.start(`Build queue: ${release.queue} ahead...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  private async handleBuildInterrupt(releaseID: string, isCanceled: boolean): Promise<void> {
    if (isCanceled) process.exit(3);
    
    isCanceled = true;
    this.spinner.start('\nCanceling build...');
    
    try {
      await cancelDeployment(this.got, releaseID, { 
        retries: 3,
        onRetry: (error, attempt) => {
          this.debug(error.stack);
          this.log(`Retry ${attempt}: Cancel failed, retrying...`);
        }
      });
      this.spinner.warn('Build canceled.');
      process.exit(3);
    } catch (error) {
      this.spinner.fail('Failed to cancel build.');
      process.exit(1);
    }
  }

  private async monitorBuildProgress(releaseID: string, isCanceled: boolean): Promise<void> {
    let isPushing = false;
    
    await buildLogs(this.got, releaseID, isCanceled, (output) => {
      switch (output.state as DeploymentState) {
        case 'PUSHED':
          this.spinner.succeed('Image pushed.');
          break;
          
        case 'DEPLOYING':
          this.spinner.start("Checking container health...");
          break;
          
        case 'UNHEALTHY':
          this.spinner.warn('Container deployed but unhealthy. Check logs.');
          break;
          
        case 'BUILDING':
          if (output.line) {
            this.spinner.clear().frame();
            process.stdout.write(output.line);
          }
          break;
          
        case 'PUSHING':
          if (!isPushing) {
            isPushing = true;
            this.spinner.succeed('Build finished.');
          }
          if (output.line) {
            this.spinner.clear().frame();
            this.spinner.start(output.line);
          }
          break;
      }
    });
  }

  async showReleaseLogs(releaseID: string): Promise<void> {
    this.spinner.start('Creating release...');
    
    return new Promise((resolve, reject) => {
      const poller = new Poller();
      
      poller.onPoll(async () => {
        try {
          const { release } = await this.got(`v1/releases/${releaseID}`)
            .json<{ release: IRelease }>();

          switch (release.state) {
            case 'FAILED':
              this.spinner.fail();
              return reject(new DeployException(this.parseFailReason(release.failReason || 'Release failed')));
              
            case 'UNHEALTHY':
              this.spinner.warn('Container deployed but unhealthy. Check logs.');
              return reject(new ReleaseFailed('Container unhealthy. Check web panel logs.'));
              
            case 'READY':
              this.spinner.succeed('Release healthy.');
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
