import path from 'path';
import { red, bold } from 'chalk';
import { readJSONSync, existsSync } from 'fs-extra';

function logError(err) {
  console.log(red('> Error!'), err);
  process.exit(1);
}

export default function detectDeploymentType(args, projectPath) {
  const hasComposerJsonFile = existsSync(path.join(projectPath, 'composer.json'));
  const hasPackageFile = existsSync(path.join(projectPath, 'package.json'));
  const hasDockerFile = existsSync(path.join(projectPath, 'Dockerfile'));

  const deploymentTypes = [
    'node',
    'docker',
    'static',
    'laravel',
  ];

  const specifiedDeploymentTypes =
    Object.keys(args).filter(key => deploymentTypes.find(type => type === key));

  if(specifiedDeploymentTypes.length > 1) {
    logError(`You can not specify multiple deployment types.`);
  }

  if(args.laravel) {
    if( ! hasComposerJsonFile) {
      logError(`${bold('`composer.json`')} file doesn't exists.`);
    }
    return 'laravel';
  }

  if(args.node) {
    if( ! hasPackageFile) {
        logError(`${bold('`package.json`')} file doesn't exists.`);
    }
    return 'node';
  }

  if(args.docker) {
    if( ! hasDockerFile) {
      logError(`${bold('`Dockerfile`')} file doesn't exists.`);
    }
    return 'docker';
  }

  if(args.static) {
    // TODO:
    // if(files.length === 0) {
    //   logError('Project is empty!');
    // }

    return 'static';
  }

  if(hasComposerJsonFile && hasDockerFile) {
    logError(`The project contains both of the \`composer.json\` and \`Dockerfile\` files.
Please specify your deployment type with --laravel or --docker.`);
  }

  if(hasComposerJsonFile) {
    const { path } = hasComposerJsonFile;
    const composerJson = readJSONSync('composer.json');

    if(!composerJson.require || !composerJson.require['laravel/framework']) {
      logError(`The project contains a \`composer.json\` file but Laravel framework doesn't listed as a dependency.
Currently, we only support Laravel projects in the PHP ecosystem.\n`);
    }

    return 'laravel';
  }

  if(hasPackageFile && hasDockerFile) {
    logError(`The project contains both of the \`package.json\` and \`Dockerfile\` files.
Please specify your deployment type with --node or --docker.`);
  }

  if(hasPackageFile) {
    return 'node';
  }

  if(hasDockerFile) {
    return 'docker';
  }

  // TODO:
  // if(files.length === 0) {
  //   logError('Project is empty!');
  // }

  return 'static';
}