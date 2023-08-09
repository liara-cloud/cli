export default interface IFlags {
  path?: string;
  platform?: string;
  port?: number;
  image?: string;
  'api-token'?: string;
  region?: string;
  detach: boolean;
  args?: string;
  'build-arg'?: string[];
  message?: string;
  disks?: string[];
  dockerfile?: string;
}
