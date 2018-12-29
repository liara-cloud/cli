import path from 'path';
import { bold } from 'chalk';
import { readJSONSync, existsSync, readdirSync } from 'fs-extra';

export default function detectDeploymentType(args, projectPath) {
  const packageJsonFilePath = path.join(projectPath, 'package.json');
  const composeJsonFilePath = path.join(projectPath, 'composer.json');

  const hasPackageFile = existsSync(packageJsonFilePath);
  const hasComposerJsonFile = existsSync(composeJsonFilePath);
  const hasDockerFile = existsSync(path.join(projectPath, 'Dockerfile'));

  const deploymentTypes = [
    'node',
    'docker',
    'static',
    'angular',
    'laravel',
  ];

  const specifiedDeploymentTypes =
    Object.keys(args).filter(key => deploymentTypes.find(type => type === key));

  if(specifiedDeploymentTypes.length > 1) {
    throw new Error(`You can not specify multiple deployment types.`);
  }

  if(readdirSync(projectPath).length === 0) {
    throw new Error('Project is empty!');
  }

  if(args.laravel) {
    if( ! hasComposerJsonFile) {
      throw new Error(`${bold('`composer.json`')} file doesn't exists.`);
    }
    return 'laravel';
  }

  if(args.node) {
    if( ! hasPackageFile) {
      throw new Error(`${bold('`package.json`')} file doesn't exists.`);
    }
    return 'node';
  }

  if(args.angular) {
    if( ! hasPackageFile) {
      throw new Error(`${bold('`package.json`')} file doesn't exists.`);
    }
    return 'angular';
  }

  if(args.docker) {
    if( ! hasDockerFile) {
      throw new Error(`${bold('`Dockerfile`')} file doesn't exists.`);
    }
    return 'docker';
  }

  if(args.static) {
    return 'static';
  }

  if(hasComposerJsonFile && hasDockerFile) {
    throw new Error(`The project contains both of the \`composer.json\` and \`Dockerfile\` files.
Please specify your deployment type with --laravel or --docker.`);
  }

  if(hasComposerJsonFile) {
    const composerJson = readJSONSync(composeJsonFilePath);

    if(!composerJson.require || !composerJson.require['laravel/framework']) {
      throw new Error(`The project contains a \`composer.json\` file but Laravel framework doesn't listed as a dependency.
Currently, we only support Laravel projects in the PHP ecosystem.\n`);
    }

    return 'laravel';
  }

  if(hasPackageFile && hasDockerFile) {
    throw new Error(`The project contains both of the \`package.json\` and \`Dockerfile\` files.
Please specify your deployment type with --node or --docker.`);
  }

  if(hasPackageFile) {
    const packageJson = readJSONSync(packageJsonFilePath);

    if(packageJson.dependencies && packageJson.dependencies['@angular/core']) {
      return 'angular';
    }

    return 'node';
  }

  if(hasDockerFile) {
    return 'docker';
  }

  return 'static';
}