import axios from 'axios';
import bytes from 'bytes';
import stream from 'stream';
import { white, cyan, gray } from 'chalk';
import retry from 'async-retry';
import auth from '../middlewares/auth';
import getFiles from '../util/get-files';
import getPort from '../util/get-port';
import getDeploymentName from '../util/get-deployment-name';
import convertEnvsToObject from '../util/convert-envs-to-object';
import detectDeploymentType from '../util/detect-deployment-type';
import ensureAppHasDockerfile from '../util/ensure-has-dockerfile';

export default auth(async function deploy(args, config) {
  const { path, debug, e: envs = [] } = args;

  const projectPath = path ? path : process.cwd();
  console.log(`${gray('Deploying:')} ${projectPath}`)

  debug && console.time('[debug] making hashes')
  const { files, mapHashesToFiles } = await getFiles(projectPath);
  debug && console.log('[debug] files count:', files.length);
  debug && console.timeEnd('[debug] making hashes');

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  console.log(gray('Project size:'), bytes(totalBytes));

  const deploymentType = detectDeploymentType(args, files);
  console.log(`${gray('Detected deployment type:')} ${deploymentType}`);

  debug && console.time('[debug] Ensure app has Dockerfile');
  const { filesWithDockerfile, mapHashesToFilesWithDockerfile } =
    ensureAppHasDockerfile(deploymentType, files, mapHashesToFiles);
  debug && console.timeEnd('[debug] Ensure app has Dockerfile');

  const name = await getDeploymentName(deploymentType, projectPath);
  const port = getPort(deploymentType);
  const envsObject = convertEnvsToObject(envs);

  const deployment = await retry(async bail => {
    const body = {
      name,
      port,
      envs: envsObject,
      files: filesWithDockerfile,
    };

    try {
      const { data } = await axios.post(`/api/v1/deployments`, body, {
        baseURL: config.apiURL,
        headers: {
          Authorization: `Bearer ${config.api_token}`,
        }
      });

      return data;
    } catch(err) {
      if(err.response.status === 400 && err.response.data.message === 'missing_files') {
        const { missing_files } = err.response.data;

        debug && console.log(`[debug] missing files: ${missing_files.length}`);

        await uploadMissingFiles(
          mapHashesToFilesWithDockerfile,
          missing_files,
          config,
        );

        throw err; // retry deployment
      }

      if(err.response.status > 400 && err.response.status < 500) {
        return bail(err);
      }

      // Retry deployment if the error is a http error
      if(err.response || err.request) {
        throw err;
      }

      console.error(err);
      return bail(err);
    }

  }, {
    onRetry(err) {
      debug && console.log('[debug] Retrying deployment...');
    }
  });

  console.log();
  console.log(white('Deployment finished successfully:'));
  console.log(`    ${cyan(deployment.url)}`);
  console.log();
});

function uploadMissingFiles(mapHashesToFiles, missing_files, config) {
  return new Promise.all(missing_files.map(file => {
    const { data } = mapHashesToFiles.get(file);

    const dataStream = new stream.PassThrough();
    dataStream.end(data);

    return axios({
      method: 'post',
      url: '/api/v1/files',
      baseURL: config.apiURL,
      data: dataStream,
      headers: {
        'X-File-Digest': file,
        'Content-Type': 'application/octet-stream',
        Authorization: `Bearer ${config.api_token}`,
      },
    });
  }));
}