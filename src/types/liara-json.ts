import IDisk from './disk';
import IBuildConfig from './build-config';
import ILaravelPlatformConfig from './laravel-platform-config';
import INodePlatformConfig from './node-platfrom-config';
import IHealthConfig from './health-config';

export default interface ILiaraJSON {
  app?: string;
  port?: number;
  args?: string[];
  cron?: string[];
  disks?: IDisk[];
  platform?: string;
  'build-arg'?: string[];
  build?: IBuildConfig;
  node?: INodePlatformConfig;
  healthCheck?: IHealthConfig;
  laravel?: ILaravelPlatformConfig;
}
