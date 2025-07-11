import IDisk from './disk.js';
import IBuildConfig from './build-config.js';
import IHealthConfig from './health-config.js';

import ILaravelPlatformConfig from './laravel-platform-config.js';
import IAngularPlatformConfig from './angular-platfrom-config.js';
import IDotnetPlatformConfig from './dotnet-platform-config.js';
import IDjangoPlatformConfig from './django-platfrom-config.js';
import IPythonPlatformConfig from './python-platfrom-config.js';
import IFlaskPlatformConfig from './flask-platfrom-config.js';
import IReactPlatformConfig from './react-platfrom-config.js';
import INodePlatformConfig from './node-platfrom-config.js';
import INextPlatformConfig from './next-platfrom-config.js';
import IVuePlatformConfig from './vue-platfrom-config.js';
import IPhpPlatformConfig from './php-platfrom-config.js';
import IGoPlatformConfig from './go-platfrom-config.js';

export default interface ILiaraJSON {
  app?: string;
  port?: number;
  args?: string[];
  cron?: string[];
  disks?: IDisk[];
  platform?: string;
  build?: IBuildConfig;
  healthCheck?: IHealthConfig;
  'team-id'?: string;

  laravel?: ILaravelPlatformConfig;
  angular?: IAngularPlatformConfig;
  dotnet?: IDotnetPlatformConfig;
  djnago?: IDjangoPlatformConfig;
  python?: IPythonPlatformConfig;
  flask?: IFlaskPlatformConfig;
  react?: IReactPlatformConfig;
  node?: INodePlatformConfig;
  next?: INextPlatformConfig;
  vue?: IVuePlatformConfig;
  php?: IPhpPlatformConfig;
  go?: IGoPlatformConfig;
}
