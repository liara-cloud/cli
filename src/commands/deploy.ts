import os from 'os'
import ora from 'ora'
import path from 'path'
import chalk from 'chalk'
import bytes from 'bytes'
import fs from 'fs-extra'
import axios from 'axios'
import moment from 'moment'
import inquirer from 'inquirer'
import retry from 'async-retry'
import FormData from 'form-data'
import ProgressBar from 'progress'
import {flags} from '@oclif/command'

import Logs from './logs'
import Command from '../base'
import Poller from '../utils/poller'
import {DEV_MODE} from '../constants'
import getPort from '../utils/get-port'
import checkPath from '../utils/check-path'
import onInterupt from '../utils/on-intrupt'
import validatePort from '../utils/validate-port'
import {createDebugLogger} from '../utils/output'
import createArchive from '../utils/create-archive'
import detectPlatform from '../utils/detect-platform'
import collectGitInfo from '../utils/collect-git-info'

interface ILaravelPlatformConfig {
  routeCache?: boolean,
  configCache?: boolean,
  buildAssets?: boolean,
}

interface INodePlatformConfig {
  version?: number,
}

interface IHealthConfig {
  command?: string | string[],
  interval?: number,
  timeout?: number,
  retries?: number,
  startPeriod?: number,
}

interface IDisk {
  name: String,
  mountTo: String,
}

interface ILiaraJSON {
  app?: string,
  platform?: string,
  port?: number,
  volume?: string,
  args?: string[],
  'build-arg'?: string[],
  cron?: string[],
  disks?: IDisk[],
  laravel?: ILaravelPlatformConfig,
  node?: INodePlatformConfig,
  healthCheck?: IHealthConfig,
}

interface IFlags {
  path?: string,
  platform?: string,
  project?: string,
  port?: number,
  volume?: string,
  image?: string,
  'api-token'?: string,
  'region'?: string,
  'detach': boolean,
  args?: string[],
  'build-arg'?: string[],
  message?: string,
}

interface IDeploymentConfig extends IFlags, ILiaraJSON {
  path: string,
}

interface IProject {
  project_id: string,
}

interface IGetProjectsResponse {
  projects: IProject[]
}

interface IRelease {
  state: string, status: string, failReason?: string
}

interface IBuildLogsResponse {
  release: IRelease,
  buildOutput: IBuildOutput[],
}

interface IBuildOutput {
  _id: string,
  line: string,
  stream: string,
  releaseID: string,
  createdAt: string,
}

interface ICreatedRelease {
  releaseID: string,
}

const MAX_SOURCE_SIZE = 200 * 1024 * 1024 // 200 MB

class DeployException extends Error {}

export default class Deploy extends Command {
  static description = 'deploy an app'

  static flags = {
    ...Command.flags,
    path: flags.string({description: 'app path in your computer'}),
    platform: flags.string({description: 'the platform your app needs to run'}),
    app: flags.string({char: 'a', description: 'app id'}),
    port: flags.integer({description: 'the port that your app listens to'}),
    volume: flags.string({char: 'v', description: 'volume absolute path'}),
    image: flags.string({char: 'i', description: 'docker image to deploy'}),
    'detach': flags.boolean({description: 'do not stream app logs after deployment', default: false}),
    args: flags.string({description: 'docker image entrypoint args', multiple: true}),
    'build-arg': flags.string({description: 'docker image build args', multiple: true}),
    message: flags.string({char: 'm', description: 'the release message'}),
  }

  spinner!: ora.Ora

  async run() {
    const {flags} = this.parse(Deploy)
    const config: IDeploymentConfig = this.getMergedConfig(flags)
    const debug = createDebugLogger(flags.debug)
    this.debug = debug
    this.spinner = ora()

    if (!config.image) {
      try {
        checkPath(config.path)
      } catch (error) {
        this.error(error.message)
      }

      this.dontDeployEmptyProjects(config.path)
    }

    this.setAxiosConfig(config)

    this.validateDeploymentConfig(config)

    let isPlatformDetected = false
    if (!config.image) {
      if (!config.platform) {
        try {
          config.platform = detectPlatform(config.path)
          isPlatformDetected = true
        } catch (error) {
          return this.error(error.message)
        }
      }

      this.validatePlatform(config.platform, config.path)
    } else {
      config.platform = 'docker'
    }

    if (!config.app) {
      config.app = await this.promptProject()
    }

    if (!config.port) {
      config.port = getPort(config.platform) || await this.promptPort()
    }

    this.logKeyValue('App', config.app)
    this.logKeyValue('Path', config.path)
    isPlatformDetected
      ? this.logKeyValue('Detected platform', config.platform)
      : this.logKeyValue('Platform', config.platform)
    this.logKeyValue('Port', String(config.port))

    if(config.volume) {
      this.logKeyValue('Volume', config.volume)
      console.log(`${chalk.yellowBright('[warn]')} "volume" field is deprecated. Please use "disks" instead: https://docs.liara.ir/apps/disks`)
    }

    if(config.disks) {
      this.logKeyValue('Disks')
      for(const disk of config.disks) {
        console.log(`  ${disk.name} ${chalk.blue('->')} ${disk.mountTo}`)
      }
    }

    try {
      const response = await this.deploy(config)

      !config.image && await this.showBuildLogs(response.releaseID)
      config.image && await this.showReleaseLogs(response.releaseID)

      this.log()
      this.log(chalk.green('Deployment finished successfully.'))
      this.log(chalk.white('Open up the url below in your browser:'))
      this.log()

      const defaultSubdomain: string = config.region === 'iran' ? ".iran.liara.run" : ".liara.run"
      const urlLogMessage = DEV_MODE
        // tslint:disable-next-line: no-http-string
        ? `    ${chalk.cyan(`http://${config.app}.liara.localhost`)}`
        : `    ${chalk.cyan(`https://${config.app}${defaultSubdomain}`)}`
      this.log(urlLogMessage)

      this.log()

      if (!flags['detach']) {
        this.log('Reading app logs...')
        await Logs.run([
          '--app', config.app,
          '--since', moment().unix().toString(),
          '--api-token', flags["api-token"] || '',
          '--region', config.region || '',
        ])
      }

    } catch (error) {
      this.log()
      this.spinner.stop()
      error.response && debug(error.response.body)
      !error.response && debug(error)

      const responseBody = error.response && error.response.statusCode >= 400 && error.response.statusCode < 500
        ? JSON.parse(error.response.body)
        : {};

      if (error.message === 'TIMEOUT') {
        this.error('Build timed out. It took about 10 minutes.')
      }

      if (error.response && error.response.statusCode === 404 && responseBody.message === 'project_not_found') {
        const message = `App does not exist.
Please open up https://console.liara.ir/apps and create the app, first.`
        return this.error(message)
      }

      if (error.response && error.response.statusCode === 400 && responseBody.message === 'frozen_project') {
        const message = `App is frozen (not enough balance).
Please open up https://console.liara.ir/apps and unfreeze the app.`
        return this.error(message)
      }

      if (error.response && error.response.statusCode >= 400 && error.response.statusCode < 500 && responseBody.message) {
        const message = `CODE ${error.response.statusCode}: ${responseBody.message}`
        return this.error(message)
      }

      this.error(`Deployment failed.
Sorry for inconvenience. If you think it's a bug, please contact us.`)
    }
  }

  async deploy(config: IDeploymentConfig) {
    const body: {[k: string]: any} = {
      build: {},
      cron: config.cron,
      args: config.args,
      port: config.port,
      type: config.platform,
      mountPoint: config.volume,
      message: config.message,
      disks: config.disks,
    }

    if (config.image) {
      body.image = config.image
      return this.createRelease(config.app as string, body)
    }

    if (config['build-arg']) {
      body.build.args = config['build-arg']
    }

    body.gitInfo = collectGitInfo(config.path, this.debug)

    // @ts-ignore
    body.platformConfig = config[config.platform]

    if(config.healthCheck) {
      body.healthCheck = config.healthCheck;

      if(typeof config.healthCheck.command === 'string') {
        body.healthCheck.command = config.healthCheck.command.split(' ')
      }
    }

    this.log(`${chalk.cyanBright('[info]')} Finding the .gitignore files...`)

    this.spinner.start('Creating an archive...')

    const tmpDir = path.join(os.tmpdir(), '/liara-cli')
    const sourcePath = path.join(tmpDir, `${Date.now()}.tar.gz`)
    fs.ensureDirSync(tmpDir)

    await createArchive(sourcePath, config.path, config.platform, this.debug)

    this.spinner.stop()

    const {size: sourceSize} = fs.statSync(sourcePath)

    this.logKeyValue('Compressed size', bytes(sourceSize))

    if(sourceSize > MAX_SOURCE_SIZE) {
      this.error('Source is too large. (max: 200MB)')
    }

    const sourceID = await this.upload(config.app as string, sourcePath, sourceSize)

    body.sourceID = sourceID
    return this.createRelease(config.app as string, body)
  }

  createRelease(project: string, body: {[k: string]: any}) {
    return this.got.post(`v2/projects/${project}/releases`, { json: body }).json<ICreatedRelease>()
  }

  async showBuildLogs(releaseID: string) {
    this.spinner.start('Building...')

    let isCanceled = false

    const removeInterupListener = onInterupt(async () => {
      // Force close
      if (isCanceled) process.exit(3)

      this.spinner.start('\nCanceling the build...')
      isCanceled = true

      const retryOptions = {
        retries: 3,
        onRetry: (error: any, attempt: number) => {
          this.debug(error.stack)
          this.log(`${attempt}: Could not cancel, retrying...`)
        }
      }
      await retry(async () => {
        await axios.post(`/v2/releases/${releaseID}/cancel`, null, this.axiosConfig)
      }, retryOptions)

      this.spinner.warn('Build canceled.')
      process.exit(3)
    })

    return new Promise((resolve, reject) => {
      const poller = new Poller()

      let since: string
      let isDeploying = false

      poller.onPoll(async () => {
        try {
          const {data: {release, buildOutput}} = await axios.get<IBuildLogsResponse>(
            `/v2/releases/${releaseID}/build-logs`, {
              ...this.axiosConfig,
              params: {since},
            })

          for (const output of buildOutput) {
            this.spinner.clear().frame()

            if (output.stream === 'STDOUT') {
              process.stdout.write(output.line)
            } else {
              // tslint:disable-next-line: no-console
              console.error(output.line)
              return reject(new Error('Build failed.'))
            }
          }

          if (!buildOutput.length) {
            if (release.state === 'CANCELED') {
              this.spinner.warn('Build canceled.')
              process.exit(3)
            }

            if (release.state === 'TIMEDOUT') {
              this.spinner.fail();
              return reject(new Error('TIMEOUT'))
            }

            if (release.state === 'FAILED') {
              this.spinner.fail();
              if(release.failReason) {
                return reject(new DeployException(this.parseFailReason(release.failReason)))
              }
              return reject(new Error('Release failed.'))
            }

            if (release.state === 'DEPLOYING' && !isDeploying) {
              isDeploying = true
              this.spinner.succeed('Image pushed.')
              this.spinner.start('Creating a new release...')
            }

            if (release.state === 'READY') {
              this.spinner.succeed('Release created.')
              return resolve()
            }
          }

          if (buildOutput.length) {
            const lastLine = buildOutput[buildOutput.length - 1]
            since = lastLine.createdAt

            if (lastLine.line.startsWith('Successfully tagged')) {
              this.spinner.succeed('Build finished.')
              this.spinner.start('Pushing the image...')
              removeInterupListener()
            }
          }

        } catch (error) {
          this.debug(error.stack)
        }

        !isCanceled && poller.poll()
      })

      !isCanceled && poller.poll()
    })
  }

  async showReleaseLogs(releaseID: string) {
    this.spinner.start('Creating a new release...')

    return new Promise((resolve, reject) => {
      const poller = new Poller()

      poller.onPoll(async () => {
        try {
          const {data: {release}} = await axios.get<{release: IRelease}>(`/v1/releases/${releaseID}`, this.axiosConfig)

          if (release.state === 'FAILED') {
            this.spinner.fail();
            if(release.failReason) {
              return reject(new DeployException(this.parseFailReason(release.failReason)))
            }
            return reject(new Error('Release failed.'))
          }

          if (release.state === 'READY') {
            this.spinner.succeed('Release created.')
            return resolve()
          }

        } catch (error) {
          this.debug(error.stack)
        }

        poller.poll()
      })

      poller.poll()
    })
  }

  parseFailReason(reason: string) {
    const [errorName, ...data] = reason.split(' ');

    if(errorName === 'disk_not_found') {
      return `Could not find disk \`${data[0]}\`.`;
    }

    return reason;
  }

  dontDeployEmptyProjects(projectPath: string) {
    if (fs.readdirSync(projectPath).length === 0) {
      this.error('Directory is empty!')
    }
  }

  logKeyValue(key: string, value: string = ''): void {
    this.spinner.clear().frame()
    this.log(`${chalk.blue(`${key}:`)} ${value}`)
  }

  validateDeploymentConfig(config: IDeploymentConfig) {
    if(config.volume && config.disks) {
      this.error("You can't use `volume` and `disks` fields at the same time.\
 Please consider using only one of them.");
    }

    if (config.volume && !path.isAbsolute(config.volume)) {
      this.error('Volume path must be absolute.')
    }

    if(config.healthCheck && ! config.healthCheck.command) {
      this.error('`command` field in healthCheck is required.')
    }

    if(config.healthCheck &&
        typeof config.healthCheck.command !== 'string' &&
        ! Array.isArray(config.healthCheck.command)
    ) {
      this.error('`command` field in healthCheck must be either an array or a string.')
    }
  }

  async promptProject(): Promise<string> {
    this.spinner.start('Loading...')

    try {
      const {data: {projects}} = await axios.get<IGetProjectsResponse>('/v1/projects', this.axiosConfig)

      this.spinner.stop()

      if (!projects.length) {
        this.warn('Please go to https://console.liara.ir/apps and create an app, first.')
        this.exit(1)
      }

      const {project} = await inquirer.prompt({
        name: 'project',
        type: 'list',
        message: 'Please select an app:',
        choices: [
          ...projects.map(project => project.project_id),
        ]
      }) as {project: string}

      return project

    } catch (error) {
      this.spinner.stop()
      throw error
    }
  }

  async promptPort(): Promise<number> {
    const {port} = await inquirer.prompt({
      name: 'port',
      type: 'input',
      default: 3000,
      message: 'Enter the port your app listens to:',
      validate: validatePort,
    }) as {port: number}

    return port
  }

  getMergedConfig(flags: IFlags): IDeploymentConfig {
    const defaults = {
      path: flags.path ? flags.path : process.cwd(),
      ...this.readGlobalConfig()
    }
    const projectConfig = this.readProjectConfig(defaults.path)
    return {
      ...defaults,
      ...projectConfig,
      ...flags,
    }
  }

  readProjectConfig(projectPath: string): ILiaraJSON {
    let content
    const liaraJSONPath = path.join(projectPath, 'liara.json')
    const hasLiaraJSONFile = fs.existsSync(liaraJSONPath)
    if (hasLiaraJSONFile) {
      try {
        content = fs.readJSONSync(liaraJSONPath) || {}

      } catch {
        this.error('Syntax error in `liara.json`!')
      }
    }

    return content || {}
  }

  validatePlatform(platform: string, projectPath: string): void {
    if (platform === 'node') {
      const packageJSON = fs.readJSONSync(path.join(projectPath, 'package.json'))

      if (!packageJSON.scripts || !packageJSON.scripts.start) {
        this.error(`A NodeJS app must be runnable with 'npm start'.
You must add a 'start' command to your package.json scripts.`)
      }
    }
  }

  async upload(project: string, sourcePath: string, sourceSize: number): Promise<string> {
    const body = new FormData();
    body.append('file', fs.createReadStream(sourcePath))

    const bar = new ProgressBar('Uploading [:bar] :percent :etas', {
      total: sourceSize,
      width: 20,
      complete: '=',
      incomplete: '',
      clear: true,
    })

    try {
      const response = await this.got.post(`v2/projects/${project}/sources`, { body })
        .on('uploadProgress', progress => {
          bar.tick(progress.transferred - bar.curr)
        })
        .json<{ sourceID: string }>()

      this.spinner.succeed('Upload finished.')

      return response.sourceID

    } catch (error) {
      this.spinner.fail('Upload failed.')
      throw error

    } finally {
      // cleanup
      fs.unlink(sourcePath).catch(() => {})
    }
  }
}
