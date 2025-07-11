export default interface ILaravelPlatformConfig {
  timezone?: string;
  phpVersion?: string;
  npmMirror: boolean;
  routeCache?: boolean;
  configCache?: boolean;
  buildAssets?: boolean;
  ssr: boolean;
  modifyImagickPolicy: boolean;
  installDevDependencies: boolean;
  composerMirror: boolean;
  reverb: boolean;
  reverbPath: string;
  modifyHtaccess: boolean;
}
