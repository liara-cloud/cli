export default interface IDjangoPlatformConfig {
  mirror: boolean;
  timezone: string;
  settingsFile: string;
  modifySettings: boolean;
  collectStatic: boolean;
  compileMessages: boolean;
  geospatial: boolean;
  pipTimeout: number;
  pythonVersion: string;
  nodeVersion: string;
}
