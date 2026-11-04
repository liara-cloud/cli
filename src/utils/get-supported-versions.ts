import semver from 'semver';

interface IVersions {
  [platform: string]: {
    defaultVersion: string;
    allVersions: string[];
  };
}
const versions: IVersions = {
  dotnet: {
    defaultVersion: '8.0',
    allVersions: [
      '2.1',
      '2.2',
      '3.0',
      '3.1',
      '5.0',
      '6.0',
      '7.0',
      '8.0',
      '9.0',
      '10.0',
    ],
  },
  node: {
    defaultVersion: '24',
    allVersions: ['22', '24'],
  },
  next: { defaultVersion: '24', allVersions: ['22', '24'] },
  laravel: {
    defaultVersion: '8.4',
    allVersions: ['8.4', '8.3', '8.2'],
  },
  php: {
    defaultVersion: '8.4',
    allVersions: ['8.4', '8.3', '8.2'],
  },
  python: {
    defaultVersion: '3.12',
    allVersions: ['3.7', '3.8', '3.9', '3.10', '3.11', '3.12', '3.13'],
  },
  django: {
    defaultVersion: '3.12',
    allVersions: ['3.7', '3.8', '3.9', '3.10', '3.11', '3.12', '3.13'],
  },
  flask: {
    defaultVersion: '3.12',
    allVersions: ['3.7', '3.8', '3.9', '3.10', '3.11', '3.12', '3.13'],
  },
  go: {
    defaultVersion: '1.24',
    allVersions: ['1.21', '1.22', '1.23', '1.24', '1.25'],
  },
};

export default function supportedVersions(platform: string) {
  return versions[platform as keyof typeof versions];
}

// Only versions older than every supported one are deprecated, so a newer
// version the API starts supporting doesn't need a CLI release.
export function isDeprecatedVersion(
  platform: string,
  version: number | string,
): boolean {
  const parsedVersion = semver.coerce(version);
  const platformVersions = supportedVersions(platform);

  if (!parsedVersion || !platformVersions) {
    return false;
  }

  return platformVersions.allVersions.every((supported) =>
    semver.lt(parsedVersion, semver.coerce(supported)!),
  );
}

export function getDeprecatedVersionMessage(
  platform: string,
  version: number | string,
  source: string,
): string {
  const { allVersions } = supportedVersions(platform);

  return `Version ${version} is no longer supported on the ${platform} platform.
Supported versions: ${allVersions.join(', ')}
Please update ${source}.`;
}
