import path from 'path';

import fs from 'fs-extra';
import semver from 'semver';

import findFile from './find-file';
import { DebugLogger } from './output';

interface IPlatformConfig {
  [key: string]: string | null;
}

export default async function mergePlatformConfigWithDefaults(
  projectPath: string,
  platform: string,
  userProvidedConfig: IPlatformConfig,
  debug: DebugLogger
): Promise<IPlatformConfig> {
  if (platform === 'laravel') {
    return getDefaultLaravelPlatformConfig(
      projectPath,
      userProvidedConfig,
      debug
    );
  }

  if (platform === 'netcore') {
    return await detectNetCorePlatformVersion(
      projectPath,
      userProvidedConfig,
      debug
    );
  }

  return userProvidedConfig;
}

async function detectNetCorePlatformVersion(
  projectPath: string,
  userProvidedConfig: IPlatformConfig,
  debug: DebugLogger
): Promise<IPlatformConfig> {
  const newConfig = { ...userProvidedConfig };

  if (!userProvidedConfig.version) {
    const detectedNetCoreVersion = await getRequiredNetCoreVersion(
      projectPath,
      debug
    );
    if (detectedNetCoreVersion) {
      newConfig.version = detectedNetCoreVersion;
    }
  }

  return newConfig;
}

async function getRequiredNetCoreVersion(
  projectPath: string,
  debug: DebugLogger
): Promise<string | null> {
  const supportedNetCoreVersions = ['2.1', '2.2', '3.0', '3.1', '5.0', '6.0'];

  try {
    const csproj = await findFile(projectPath, '**/*.csproj');

    if (!csproj) {
      debug(`Could not find .csproj file in ${projectPath}`);
      return null;
    }

    const csprojXml = fs.readFileSync(csproj, 'utf8');

    const dotNetVersion = semver.coerce(csprojXml, { loose: true })?.version;

    if (!dotNetVersion) {
      debug(`Could not find netcore version in ${csproj}`);
      return null;
    }

    supportedNetCoreVersions.find((version) => dotNetVersion.includes(version));

    if (
      !supportedNetCoreVersions.find((version) =>
        dotNetVersion.includes(version)
      )
    ) {
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

function getDefaultLaravelPlatformConfig(
  parojectPath: string,
  userProvidedConfig: IPlatformConfig,
  debug: DebugLogger
): IPlatformConfig {
  const newConfig = { ...userProvidedConfig };

  if (!userProvidedConfig.phpVersion) {
    const detectedPHPVersion = getRequiredPHPVersion(parojectPath, debug);
    if (detectedPHPVersion) {
      newConfig.phpVersion = detectedPHPVersion;
    }
  }

  return newConfig;
}

function getRequiredPHPVersion(
  parojectPath: string,
  debug: DebugLogger
): string | null {
  // semver forces us to use the full semver syntax,
  // but before returning the final result, we remove the last .0 part
  const supportedPHPVersions = ['8.1.0', '8.0.0', '7.4.0', '7.3.0', '7.2.0'];

  try {
    const composerJson = fs.readJSONSync(
      path.join(parojectPath, 'composer.json')
    );

    if (composerJson?.config?.platform?.php) {
      const range = convertSinglePipeToDouble(composerJson.config.platform.php);
      return normalizePHPVersion(
        semver.maxSatisfying(supportedPHPVersions, range)
      );
    }

    if (composerJson?.require?.php) {
      const range = convertSinglePipeToDouble(composerJson.require.php);
      return normalizePHPVersion(
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

// https://getcomposer.org/doc/articles/versions.md#version-range
function convertSinglePipeToDouble(input: string) {
  return input.replace(/\|{1,}/g, '||');
}

function normalizePHPVersion(version: string | null) {
  if (!version) {
    return null;
  }
  return version.replace(/.0$/, '');
}
