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
    ],
  },
  node: {
    defaultVersion: '22',
    allVersions: ['14', '16', '18', '20', '22', '24'],
  },
  next: { defaultVersion: '22', allVersions: ['20', '22', '24'] },
  laravel: {
    defaultVersion: '8.2',
    allVersions: ['8.4', '8.3', '8.2', '8.1', '8.0', '7.4', '7.3', '7.2'],
  },
  php: {
    defaultVersion: '8.0',
    allVersions: ['8.4', '8.3', '8.2', '8.1', '8.0', '7.4', '7.3', '7.2'],
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
