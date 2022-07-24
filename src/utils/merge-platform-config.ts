import path from 'path'
import { exec } from 'child_process'

import fs from 'fs-extra'
import semver from 'semver'

import { DebugLogger } from './output'

interface IPlatformConfig {
  [key: string]: string | null
}

export default async function mergePlatformConfigWithDefaults(parojectPath: string, platform: string, userProvidedConfig: IPlatformConfig, debug: DebugLogger): Promise<IPlatformConfig> {
  if(platform === 'laravel') {
    return getDefaultLaravelPlatformConfig(parojectPath, userProvidedConfig, debug)
  }

  if (platform === "netcore") {
    return await detectNetCorePlatformVersion(userProvidedConfig, debug)
  }

  return userProvidedConfig
}

async function detectNetCorePlatformVersion(userProvidedConfig: IPlatformConfig, debug: DebugLogger): Promise<IPlatformConfig> {
  const newConfig = {...userProvidedConfig}

  if(!userProvidedConfig.version) {
    const detectedNetCoreVersion = await getRequiredNetCoreVersion(debug);
    if(detectedNetCoreVersion) {
      newConfig.version = detectedNetCoreVersion
    }
  }

  return newConfig
}

async function getRequiredNetCoreVersion(debug: DebugLogger){

  const supportedNetCoreVersions = ['2.1', '2.2', '3.0', '3.1', '5.0', '6.0'];

  try {
    const dotnetVersion = await dotnetCLI('dotnet --version', debug)

    if(!dotnetVersion) {
      debug(`Could not find netcore version, dotnet cli is not installed. Skipping...`)
      return null
    }

    const dotnetVersionNumber = dotnetVersion.match(/\d+\.\d+/g)?.toString()

    if(!dotnetVersionNumber) {
      debug(`Could not find netcore version, dotnet cli is not installed. Skipping...`)
      return null
    }

    if (!supportedNetCoreVersions.includes(dotnetVersionNumber)) {
      debug(`${dotnetVersion} is not a supported netcore version.`)
      return null
    }

    return dotnetVersionNumber
  } catch (error) {
    debug(`Could not detect netcore version.Skipping... message=${error.message}`)
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

function dotnetCLI(command: string, debug: DebugLogger): Promise<string | null> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        debug(`dotnet CLI error: ${error.message}`)
        return resolve(null)
      }
      return resolve(stdout.toString().trim())
    })
  })
}