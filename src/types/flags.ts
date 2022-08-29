export default interface IFlags {
  path?: string,
  platform?: string,
  port?: number,
  volume?: string,
  image?: string,
  'api-token'?: string,
  region?: string,
  detach: boolean,
  args?: string[],
  'build-arg'?: string[],
  message?: string,
  disks?: string[],
}