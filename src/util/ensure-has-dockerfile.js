import hash from './hash';

const dockerfiles = {
  node: Buffer.from('FROM liararepo/node-platform'),
  static: Buffer.from('FROM liararepo/static-platform'),
  laravel: Buffer.from('FROM liararepo/laravel-platform'),
  angular: Buffer.from(`FROM liararepo/angular-platform:builder as builder
FROM liararepo/angular-platform:nginx`),
  wordpress: Buffer.from('FROM liararepo/wordpress-platform'),
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
      files: [...(mapHashesToFiles.get(dockerfile.checksum) || { files: [] }).files, 'Dockerfile'],
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