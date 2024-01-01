import { execSync } from 'node:child_process';

function getPlatformVersion(platform: string) {
  const platformsVersionCommand: { [key: string]: string } = {
    python: 'python --version',
    php: 'php --version',
    node: 'node --version',
  };
  const platformsVersionTrim: {
    [key: string]: (rawVersion: string) => string;
  } = {
    python: (rawVersion: string) =>
      rawVersion.trim().split(' ')[1].split('.').slice(0, 2).join('.'),
    php: (rawVersion: string) =>
      rawVersion.trim().split(' ')[1].split('.').slice(0, 2).join('.'),
    node: (rawVersion: string) => rawVersion.trim().slice(1).split('.')[0],
  };

  const command = platformsVersionCommand[platform];
  let output: string;

  try {
    output = execSync(command).toString();
    console.log(`Found a version of ${platform}`);
  } catch {
    console.log(`Could not determine ${platform} version`);
    return;
  }

  try {
    const realVersion = platformsVersionTrim[platform](output);
    console.log('The version is:', realVersion);
  } catch (error) {
    console.log('Could not trim founded version');

    return;
  }
}

getPlatformVersion('python');
getPlatformVersion('php');
getPlatformVersion('node');
