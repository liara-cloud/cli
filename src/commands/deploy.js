import bytes from 'bytes';
import auth from '../middlewares/auth';
import getFiles from '../util/get-files';
import detectDeploymentType from '../util/detect-deployment-type';
import ensureAppHasDockerfile from '../util/ensure-has-dockerfile';

export default auth(async function deploy(args, config) {
  const { path, debug } = args;

  const projectPath = path ? path : process.cwd();
  console.log(`Deploying: ${projectPath}`)

  debug && console.time('[debug] making hashes')
  const { files, mapHashesToFiles } = await getFiles(projectPath);
  debug && console.log('[debug] files count:', files.length);
  debug && console.timeEnd('[debug] making hashes');

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  console.log('Project size:', bytes(totalBytes, {unitSeparator: ' '}));

  const deploymentType = detectDeploymentType(args, files);
  console.log(`Detected deployment type: ${deploymentType}`);

  debug && console.time('[debug] Ensure app has Dockerfile');
  const { filesWithDockerfile, mapHashesToFilesWithDockerfile } =
    ensureAppHasDockerfile(deploymentType, files, mapHashesToFiles);
  debug && console.timeEnd('[debug] Ensure app has Dockerfile');
});