import hash from './hash';

const dockerfiles = {
  node: new Buffer('FROM node-platform'),
  static: new Buffer('FROM static-platform'),
  laravel: new Buffer('FROM laravel-platform'),
};

export default function ensureAppHasDockerfile(deploymentType, files, mapHashesToFiles) {
  if(deploymentType === 'docker') {
    return {
      filesWithDockerfile: files,
      mapHashesToFilesWithDockerfile: mapHashesToFiles,
    };
  }

  // get a dockerfile related to the deployment type
  const dockerfile = getDeploymentDockerfile(deploymentType);

  return {
    filesWithDockerfile: [
      // Remove user-defined Dockerfile
      ...files.filter(file => file.path !== 'Dockerfile'),
  
      dockerfile,
    ],
    mapHashesToFilesWithDockerfile: (new Map(mapHashesToFiles)).set(dockerfile.checksum, {
      names: [...(mapHashesToFiles.get(dockerfile.checksum) || { names: [] }).names, 'Dockerfile'],
      data: dockerfiles[deploymentType],
    }),
  };
}

function getDeploymentDockerfile(deploymentType, files) {
  const dockerfile = {
    path: 'Dockerfile',
    mode: 33204, // _rw_rw_r__
    size: dockerfiles[deploymentType].length,
    checksum: hash(dockerfiles[deploymentType]),
  };

  return dockerfile;
}