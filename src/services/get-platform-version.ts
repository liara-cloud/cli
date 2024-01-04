import fs from 'fs-extra';
import semver from 'semver';
import path from 'node:path';
import findFile from '../utils/find-file.js';
import { execSync } from 'node:child_process';
import { DebugLogger } from '../utils/output.js';

interface IPlatformConfig {
  [key: string]: string | null;
}

async function getPlatformVersion(
  /* first of all, we do a set of work for each platform to determine the correct version for the project.
  If we don't get any result, then we determine the platform version simply by executing platform runtime command. */
  platform: string,
  projectPath: string,
  debug: DebugLogger = () => {}
) {
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

  // Below codes are for derived platforms
  platformsVersionCommand['django'] = platformsVersionCommand['python'];
  platformsVersionCommand['flask'] = platformsVersionCommand['python'];
  platformsVersionCommand['laravel'] = platformsVersionCommand['php'];

  platformsVersionTrim['django'] = platformsVersionTrim['python'];
  platformsVersionTrim['flask'] = platformsVersionTrim['python'];
  platformsVersionTrim['laravel'] = platformsVersionTrim['php'];

  // Here is the first part
  let pureVersion: string | null = null;

  switch (platform) {
    case 'django':
      // needs implementation
      break;
    case 'flask':
      // needs implementation
      break;
    case 'php':
      // needs implementation
      break;
    case 'laravel':
      pureVersion = getDefaultLaravelPlatformConfig(projectPath, debug);
      break;
    case 'node':
      // needs implementation
      break;
    case 'netcore':
      pureVersion = await detectNetCorePlatformVersion(projectPath, debug);
      break;

    default:
      debug(`Can not auto-detect version for ${platform} platform`);
      debug('How TF did we get here?'); // This should not get printed.
      break;
  }

  debug(`pureVersion: ${pureVersion}`);
  if (pureVersion) {
    return pureVersion;
  }

  // second part starts from here
  const command = platformsVersionCommand[platform];
  let dirtyVersion: string;

  try {
    debug(`executing: ${command}`);

    dirtyVersion = execSync(command, {
      windowsHide: true,
      timeout: 1_000,
      stdio: ['ignore', 'pipe', 'pipe'], // ignore stdin and gets stdout and stderr
    }).toString();
    debug(`Found a version of ${platform}`);

    debug(dirtyVersion);
  } catch {
    debug(`Could not determine ${platform} version`);
    return null;
  }

  try {
    pureVersion = platformsVersionTrim[platform](dirtyVersion);
    debug(`The version is: ${pureVersion}`);
    return pureVersion;
  } catch (error) {
    debug('Could not trim founded version');
  }
  return null;
}

function getRequiredPHPVersion(
  projectPath: string,
  debug: DebugLogger
): string | null {
  // semver forces us to use the full semver syntax,
  // but before returning the final result, we remove the last .0 part
  const supportedPHPVersions = [
    '8.2.0',
    '8.1.0',
    '8.0.0',
    '7.4.0',
    '7.3.0',
    '7.2.0',
  ];

  try {
    const composerJson = fs.readJSONSync(
      path.join(projectPath, 'composer.json')
    );

    if (composerJson?.config?.platform?.php) {
      const range = convertSinglePipeToDouble(composerJson.config.platform.php);
      return normalizeVersion(
        semver.maxSatisfying(supportedPHPVersions, range)
      );
    }

    if (composerJson?.require?.php) {
      const range = convertSinglePipeToDouble(composerJson.require.php);
      return normalizeVersion(
        semver.maxSatisfying(supportedPHPVersions, range)
      );
    }

    return null;
  } catch (error) {
    if (error.syscall === 'open') {
      debug(
        `Could not open composer.json to detect the php version. Skipping... message=${error.message}`
      );
      return null;
    }

    throw error;
  }
}

function getDefaultLaravelPlatformConfig(
  projectPath: string,
  debug: DebugLogger
) {
  const detectedPHPVersion = getRequiredPHPVersion(projectPath, debug);
  if (detectedPHPVersion) {
    return detectedPHPVersion;
  }
  return null;
}

// https://getcomposer.org/doc/articles/versions.md#version-range
function convertSinglePipeToDouble(input: string) {
  return input.replace(/\|+/g, '||');
}

function normalizeVersion(version?: string | null): string | null {
  if (!version) {
    return null;
  }

  return version.replace(/.0$/, '');
}

async function detectNetCorePlatformVersion(
  projectPath: string,
  debug: DebugLogger
) {
  const detectedNetCoreVersion = await getRequiredNetCoreVersion(
    projectPath,
    debug
  );
  if (detectedNetCoreVersion) {
    return detectedNetCoreVersion;
  }
  return null;
}

async function getRequiredNetCoreVersion(
  projectPath: string,
  debug: DebugLogger
): Promise<string | null> {
  const supportedNetCoreVersions = [
    '2.1',
    '2.2',
    '3.0',
    '3.1',
    '5.0',
    '6.0',
    '7.0',
    '8.0',
  ];

  try {
    const csproj = await findFile(projectPath, '**/*.csproj');

    if (!csproj) {
      debug(`Could not find .csproj file in ${projectPath}`);
      return null;
    }

    const csprojXml = fs.readFileSync(csproj, 'utf8');

    const dotNetVersion = normalizeVersion(
      semver.coerce(csprojXml, { loose: true })?.version
    );

    if (!supportedNetCoreVersions.find((v) => dotNetVersion === v)) {
      debug(`${dotNetVersion} is not a supported netcore version.`);
      return null;
    }

    return dotNetVersion;
  } catch (error) {
    if (error.syscall === 'open') {
      debug(
        `Could not open csproj to detect the netcore version. Skipping... message=${error.message}`
      );
      return null;
    }

    throw error;
  }
}

export default getPlatformVersion;
