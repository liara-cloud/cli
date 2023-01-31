import IDisk from './disk.js';
import IBuildConfig from './build-config.js';
import ILaravelPlatformConfig from './laravel-platform-config.js';
import INodePlatformConfig from './node-platfrom-config.js';
import IHealthConfig from './health-config.js';

export default interface ILiaraJSON {
  app?: string;
  port?: number;
  args?: string[];
  cron?: string[];
  disks?: IDisk[];
  platform?: string;
  build?: IBuildConfig;
  node?: INodePlatformConfig;
  healthCheck?: IHealthConfig;
  laravel?: ILaravelPlatformConfig;
}
