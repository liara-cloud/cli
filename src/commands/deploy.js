import bytes from 'bytes';
import getFiles from '../util/get-files';
import detectDeploymentType from '../util/detect-deployment-type';

export default async function deploy(args, config) {
  const { path, debug } = args;

  const projectPath = path ? path : process.cwd();
  console.log(`Deploying: ${projectPath}`)

  debug && console.time('[debug] making hashes')
  const { files } = await getFiles(projectPath);
  debug && console.log('[debug] files count:', files.length);
  debug && console.timeEnd('[debug] making hashes');

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  console.log('Project size:', bytes(totalBytes, {unitSeparator: ' '}));

  const deploymentType = detectDeploymentType(args, files);
  console.log(`Detected deployment type: ${deploymentType}`);
};