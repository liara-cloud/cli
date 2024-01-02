import { execSync } from 'node:child_process';

function getPlatformVersion(platform: string, debugging: boolean = false) {
  const platformsVersionCommand: { [key: string]: string } = {
    python: 'python --version || python3 --version || py --version',
    php: 'php --version',
    node: 'node --version',
    netcore: 'dotnet --version',
  };
  const platformsVersionTrim: {
    [key: string]: (rawVersion: string) => string;
  } = {
    python: (rawVersion: string) =>
      rawVersion.trim().split(' ')[1].split('.').slice(0, 2).join('.'), // 3.11
    php: (rawVersion: string) =>
      rawVersion.trim().split(' ')[1].split('.').slice(0, 2).join('.'), // 8.2
    node: (rawVersion: string) => rawVersion.trim().slice(1).split('.')[0], // 18
    netcore: (rawVersion: string) => rawVersion.trim()[0] + '.0', // 5.0
  };

  const command = platformsVersionCommand[platform];
  let dirtyVersion: string;

  try {
    debugging && console.log('executing:', command);

    dirtyVersion = execSync(command, {
      windowsHide: true,
      timeout: 1_000,
      stdio: ['ignore', 'pipe', 'pipe'], // ignore stdin and gets stdout and stderr
    }).toString();
    console.log(`Found a version of ${platform}`);

    debugging && console.log(dirtyVersion);
  } catch {
    console.log(`Could not determine ${platform} version`);
    return -1;
  }

  try {
    const pureVersion = platformsVersionTrim[platform](dirtyVersion);
    console.log('The version is:', pureVersion);
    return pureVersion;
  } catch (error) {
    console.log('Could not trim founded version');
  }
  return -1;
}

export default getPlatformVersion;
