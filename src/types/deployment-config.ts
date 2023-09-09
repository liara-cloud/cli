import ILiaraJSON from './liara-json.js';

export default interface IDeploymentConfig extends ILiaraJSON {
  path: string;
  image?: string;
  'api-token'?: string;
  region?: string;
  message?: string;
  'no-cache'?: boolean;
  buildCache?: boolean;
  dockerfile?: string;
  'build-arg'?: string[];
  'build-location'?: string;
}
