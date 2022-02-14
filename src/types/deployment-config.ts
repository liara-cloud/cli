import ILiaraJSON from './liara-json'

export default interface IDeploymentConfig extends ILiaraJSON {
  path: string,
  image?: string,
  'api-token'?: string,
  region?: string,
  detach: boolean,
  message?: string,
}