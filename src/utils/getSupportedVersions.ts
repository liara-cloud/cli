const versions = {
  dotnet: ['2.1', '2.2', '3.0', '3.1', '5.0', '6.0', '7.0', '8.0', '9.0'],
  node: ['14', '16', '18', '20', '22'],
  next: ['20', '22'],
  laravel: ['8.3.0', '8.2.0', '8.1.0', '8.0.0', '7.4.0', '7.3.0', '7.2.0'],
  php: ['8.3.0', '8.2.0', '8.1.0', '8.0.0', '7.4.0', '7.3.0', '7.2.0'],
  python: ['3.7', '3.8', '3.9', '3.10', '3.11', '3.12'],
  django: ['3.7', '3.8', '3.9', '3.10', '3.11', '3.12'],
  flask: ['3.7', '3.8', '3.9', '3.10', '3.11', '3.12'],
};

type Platform = keyof typeof versions;

export default function supportedVersions(platform: Platform) {
  return versions[platform];
}
