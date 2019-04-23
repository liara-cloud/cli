import path from 'path'
import {readJSONSync, existsSync} from 'fs-extra'

export default function detectPlatform(projectPath: string) {
  const packageJsonFilePath = path.join(projectPath, 'package.json')
  const composeJsonFilePath = path.join(projectPath, 'composer.json')

  const hasPackageFile = existsSync(packageJsonFilePath)
  const hasComposerJsonFile = existsSync(composeJsonFilePath)
  const hasDockerFile = existsSync(path.join(projectPath, 'Dockerfile'))
  const hasWPContent = existsSync(path.join(projectPath, 'wp-content'))

  if (hasComposerJsonFile && hasDockerFile) {
    throw new Error(`The project contains both of the \`composer.json\` and \`Dockerfile\` files.
Please specify your platform with --platform=laravel or docker.`)
  }

  if (hasComposerJsonFile) {
    const composerJson = readJSONSync(composeJsonFilePath)

    if (!composerJson.require || !composerJson.require['laravel/framework']) {
      throw new Error(`The project contains a \`composer.json\` file but Laravel framework doesn't listed as a dependency.
Currently, we only support Laravel projects in the PHP ecosystem.\n`)
    }

    return 'laravel'
  }

  if (hasPackageFile && hasDockerFile) {
    throw new Error(`The project contains both of the \`package.json\` and \`Dockerfile\` files.
Please specify your platform with --platform=node or docker.`)
  }

  if (hasPackageFile) {
    const packageJson = readJSONSync(packageJsonFilePath)

    if (packageJson.dependencies && packageJson.dependencies['@angular/core']) {
      return 'angular'
    }

    return 'node'
  }

  if (hasWPContent && hasDockerFile) {
    throw new Error(`The project contains a \`Dockerfile\`.
Please specify your platform with --platform=wordpress or docker.`)
  }

  if (hasWPContent) {
    return 'wordpress'
  }

  if (hasDockerFile) {
    return 'docker'
  }

  return 'static'
}
