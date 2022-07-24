import path from 'path'
import fs from 'fs-extra'
import semver from 'semver'

import { DebugLogger } from './output'
import listAllFile from './list-file-recursive'

interface IPlatformConfig {
  [key: string]: string | null
}

export default function mergePlatformConfigWithDefaults(parojectPath: string, platform: string, userProvidedConfig: IPlatformConfig, debug: DebugLogger): IPlatformConfig {
  if(platform === 'laravel') {
    return getDefaultLaravelPlatformConfig(parojectPath, userProvidedConfig, debug)
  }

  if (platform === "netcore") {
    return detectNetCorePlatformVersion(parojectPath, userProvidedConfig, debug)
  }

  return userProvidedConfig
}

function detectNetCorePlatformVersion(parojectPath: string, userProvidedConfig: IPlatformConfig, debug: DebugLogger): IPlatformConfig {
  const newConfig = {...userProvidedConfig}

  if(!userProvidedConfig.version) {
    const detectedNetCoreVersion = getRequiredNetCoreVersion(parojectPath, debug)
    if(detectedNetCoreVersion) {
      newConfig.version = detectedNetCoreVersion
    }
  }

  return newConfig
}

function getRequiredNetCoreVersion(parojectPath: string, debug: DebugLogger): string | null {

  const supportedNetCoreVersions = ['2.1', '2.2', '3.0', '3.1', '5.0', '6.0'];

  try {
    const csproj = listAllFile(parojectPath).find(file => file.endsWith('.csproj'));

    if(!csproj) {
      debug(`Could not find .csproj file in ${parojectPath}`)
      return null
    }

    const csprojXml = fs.readFileSync(csproj, 'utf8');

    const dotNetVersion = csprojXml.match(/netcoreapp[0-9.]{2,}/g)?.toString().slice(-3)

    if(!dotNetVersion) {
      debug(`Could not find netcore version in ${csproj}`)
      return null
    }

    if (!supportedNetCoreVersions.includes(dotNetVersion)) {
      debug(`${dotNetVersion} is not a supported netcore version.`)
      return null
    }

    return dotNetVersion

  } catch (error) {
    console.log(error)
    if(error.syscall === 'open') {
      debug(`Could not open csproj to detect the netcore version. Skipping... message=${error.message}`)
      return null
    }
    throw error
  }
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
  const supportedPHPVersions = ['8.1.0', '8.0.0', '7.4.0', '7.3.0', '7.2.0'];

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
