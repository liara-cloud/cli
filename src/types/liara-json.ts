import IDisk from './disk';
import ILaravelPlatformConfig from './laravel-platform-config';
import INodePlatformConfig from './node-platfrom-config';
import IHealthConfig from './health-config';

export default interface ILiaraJSON {
  app?: string;
  port?: number;
  args?: string[];
  cron?: string[];
  disks?: IDisk[];
  volume?: string;
  platform?: string;
  buildCache: boolean;
  'build-arg'?: string[];
  node?: INodePlatformConfig;
  healthCheck?: IHealthConfig;
  laravel?: ILaravelPlatformConfig;
}
