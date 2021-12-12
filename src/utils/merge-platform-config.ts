import path from 'path'
import fs from 'fs-extra'
import semver from 'semver'

import { DebugLogger } from './output'

interface IPlatformConfig {
  [key: string]: string | null
}

export default function mergePlatformConfigWithDefaults(parojectPath: string, platform: string, userProvidedConfig: IPlatformConfig, debug: DebugLogger): IPlatformConfig {
  if(platform === 'laravel') {
    return getDefaultLaravelPlatformConfig(parojectPath, userProvidedConfig, debug)
  }

  return userProvidedConfig
}

function getDefaultLaravelPlatformConfig(parojectPath: string, userProvidedConfig: IPlatformConfig, debug: DebugLogger): IPlatformConfig {
  const newConfig = {...userProvidedConfig}

  if(!userProvidedConfig.phpVersion) {
    const detectedPHPVersion = getRequiredPHPVersion(parojectPath, debug)
    if(detectedPHPVersion) {
      newConfig.phpVersion = detectedPHPVersion
    }
  }

  return newConfig
}

function getRequiredPHPVersion(parojectPath: string, debug: DebugLogger): string | null {
  // semver forces us to use the full semver syntax,
  // but before returning the final result, we remove the last .0 part
  const supportedPHPVersions = ['8.0.0', '7.4.0', '7.3.0', '7.2.0'];

  try {
    const composerJson = fs.readJSONSync(path.join(parojectPath, 'composer.json'))

    if(composerJson?.config?.platform?.php) {
      const range = convertSinglePipeToDouble(composerJson.config.platform.php)
      return normalizePHPVersion(semver.maxSatisfying(supportedPHPVersions, range))
    }

    if(composerJson?.require?.php) {
      const range = convertSinglePipeToDouble(composerJson.require.php)
      return normalizePHPVersion(semver.maxSatisfying(supportedPHPVersions, range))
    }

    return null

  } catch (error) {
    if(error.syscall === 'open') {
      debug(`Could not open composer.json to detect the php version. Skipping... message=${error.message}`)
      return null
    }
    throw error
  }
}

// https://getcomposer.org/doc/articles/versions.md#version-range
function convertSinglePipeToDouble(input: string) {
  return input.replace(/\|{1,}/g, '||')
}

function normalizePHPVersion(version: string | null) {
  if(!version) {
    return null
  }
  return version.replace(/.0$/, '')
}
