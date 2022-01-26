import {IDisk} from './disk'
import {ILaravelPlatformConfig} from './laravel-platform-config'
import {INodePlatformConfig} from './node-platfrom-config'
import {IHealthConfig} from './health-config'

export interface ILiaraJSON {
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