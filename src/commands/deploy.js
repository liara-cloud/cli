import axios from 'axios';
import bytes from 'bytes';
import stream from 'stream';
import { basename } from 'path';
import retry from 'async-retry';
import inquirer, { prompt } from 'inquirer';
import { white, cyan, gray, green } from 'chalk';

import showError from '../util/error';
import auth from '../middlewares/auth';
import getFiles from '../util/get-files';
import getPort from '../util/get-port';
import eraseLines from '../util/erase-lines';
import getDeploymentName from '../util/get-deployment-name';
import convertEnvsToObject from '../util/convert-envs-to-object';
import detectDeploymentType from '../util/detect-deployment-type';
import ensureAppHasDockerfile from '../util/ensure-has-dockerfile';

export default auth(async function deploy(args, config) {
  const { project, path, debug, e: envs = [], dev } = args;

  let projectId;

  const projectPath = path ? path : process.cwd();

  const APIConfig = {
    baseURL: config.apiURL,
    headers: {
      Authorization: `Bearer ${config.api_token}`,
    }
  };

  if (typeof project === 'boolean' || !project) {
    let promptResult;

    const { data: { projects } } = await axios.get(`/v1/projects`, APIConfig);

    const createProject = async () => {
      promptResult = await prompt({
        name: 'projectId',
        type: 'input',
        message: `Enter a name for your project:`,
        default: basename(projectPath)
      });

      try {
        const body = { projectId: promptResult.projectId };
        await axios.post(`/v1/projects`, body, APIConfig);

      } catch (error) {
        if (!error.response) {
          throw error;
        }

        const { status } = error.response;

        if (status === 400) {
          showError('Only alphanumeric is allowed.');

        } else if (status === 409) {
          showError('This project ID already exists, try another one.');

        } else {
          showError('Unknown error.');
        }

        await createProject();
      }
    };

    if (!projects.length) {
      await createProject();

    } else {
      promptResult = await prompt({
        name: 'projectId',
        type: 'list',
        message: 'Please select a project:',
        choices: [
          ...projects.map(project => project.project_id),
          new inquirer.Separator(),
          { name: 'Create a new project', value: 'new' }
        ]
      });
    }

    if (promptResult.projectId === 'new') {
      process.stdout.write(eraseLines(2));
      await createProject();
    }

    projectId = promptResult.projectId;
  }

  console.log(`${gray('Project:')} ${projectId}`);

  console.log(`${gray('Deploying:')} ${projectPath}`);

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

  const name = getDeploymentName(deploymentType, projectPath);
  const port = getPort(deploymentType);
  const envsObject = convertEnvsToObject(envs);

  const deployment = await retry(async bail => {
    const body = {
      name,
      port,
      type: deploymentType,
      envs: envsObject,
      project: projectId,
      files: filesWithDockerfile,
    };

    try {
      const { data } = await axios.post(`/v1/projects/${projectId}/releases`, body, APIConfig);
      return data;

    } catch (err) {
      if (err.response.status === 400 && err.response.data.message === 'missing_files') {
        const { missing_files } = err.response.data;

        debug && console.log(`[debug] missing files: ${missing_files.length}`);

        await uploadMissingFiles(
          mapHashesToFilesWithDockerfile,
          missing_files,
          config,
        );

        throw err; // retry deployment
      }

      if (err.response.status > 400 && err.response.status < 500) {
        return bail(err);
      }

      // Retry deployment if the error is an http error
      if (err.response || err.request) {
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
  console.log(green('Deployment finished successfully.'));
  console.log(white('Open up the url below in your browser:'));
  console.log()
  dev
    ? console.log(`    ${cyan(`http://${projectId}.liara.localhost`)}`)
    : console.log(`    ${cyan(`http://${projectId}.liara.run`)}`);
  console.log();
});

function uploadMissingFiles(mapHashesToFiles, missing_files, config) {
  return new Promise.all(missing_files.map(file => {
    const { data } = mapHashesToFiles.get(file);

    const dataStream = new stream.PassThrough();
    dataStream.end(data);

    return axios({
      method: 'post',
      url: '/v1/files',
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