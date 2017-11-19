import { bold } from 'chalk';

export default function detectDeploymentType(args, files) {
  const hasPackageFile = files.find(file => file.path === 'package.json');
  const hasDockerFile = files.find(file => file.path === 'Dockerfile');

  const deploymentTypes = [
    'node',
    'docker',
    'static',
  ];

  const specifiedDeploymentTypes =
    Object.keys(args).filter(key => deploymentTypes.find(type => type === key));

  if(specifiedDeploymentTypes.length > 1) {
    throw new Error(`You can not specify multiple deployment types.`);
  }

  if(args.node) {
    if( ! hasPackageFile) {
        throw new Error(`${bold('`package.json`')} file doesn't exists.`);
    }
    return 'node';
  }

  if(args.docker) {
    if( ! hasDockerFile) {
      throw new Error(`${bold('`Dockerfile`')} file doesn't exists.`);
    }
    return 'docker';
  }

  if(args.static) {
    if(files.length === 0) {
      throw new Error('Project is empty!');
    }

    return 'static';
  }

  if(hasPackageFile && hasDockerFile) {
    throw new Error(`The project contains both of the \`package.json\` and \`Dockerfile\` files.
Please specify your deployment type with --node, --docker or --static options.`);
  }

  if(hasPackageFile) {
    return 'node';
  }

  if(hasDockerFile) {
    return 'docker';
  }

  if(files.length === 0) {
    throw new Error('Project is empty!');
  }

  return 'static';
}