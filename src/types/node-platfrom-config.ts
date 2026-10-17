export default interface INodePlatformConfig {
  version?: number;
  npmAudit?: boolean;
  npmCiFallback?: boolean;
  timezone?: string;
  mirror?: boolean;
}
