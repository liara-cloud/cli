export default interface IBuildConfig {
  dockerfile?: string;
  cache?: boolean;
  args?: string[];
  builderLocation?: string;
}
