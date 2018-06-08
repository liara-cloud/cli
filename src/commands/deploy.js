import ora from 'ora';
import axios from 'axios';
import bytes from 'bytes';
import stream from 'stream';
import retry from 'async-retry';
import EventEmitter from 'events';
import { basename, join } from 'path';
import inquirer, { prompt } from 'inquirer';
import { white, cyan, gray, green } from 'chalk';
import { existsSync, readJSONSync } from 'fs-extra';

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
  const spinner = ora('Loading projects...').start();

  const { project, path, debug, e: envs = [], dev } = args;

  let port;
  let platform;
  let liaraJSON;
  let projectId = typeof project === 'boolean' ? null : project;
  const projectPath = path ? path : process.cwd();
  const liaraJSONPath = join(projectPath, 'liara.json');

  const APIConfig = {
    baseURL: config.apiURL,
    headers: {
      Authorization: `Bearer ${config.api_token}`,
    }
  };

  const logInfo = (title, value) => {
    spinner.clear();
    spinner.frame();
    console.log(`${gray(`${title}:`)} ${value}`);
  }

  const hasLiaraJSONFile = existsSync(liaraJSONPath);
  if (hasLiaraJSONFile) {
    try {
      const liaraJSON = readJSONSync(liaraJSONPath);
    } catch (error) {
      throw new Error('Syntax error in `liara.json`!');
    }

    if (!project) {
      projectId = liaraJSON.project;
    }

    if(liaraJSON.port) {
      port = Number(liaraJSON.port);
      if(isNaN(port)) {
        throw new TypeError('The `port` field in `liara.json` must be a number.');
      }
    }

    platform = liaraJSON.platform;
    if(platform && typeof platform !== 'string') {
      throw new TypeError('The `platform` field in `liara.json` must be a string.');
    }
  }

  if (!projectId) {
    let promptResult;

    const { data: { projects } } = await axios.get(`/v1/projects`, APIConfig);

    spinner.stop();

    const createProject = async () => {
      promptResult = await prompt({
        name: 'projectId',
        type: 'input',
        message: `Enter a name for your project:`,
        default: basename(projectPath)
      });

      try {
        spinner.text = 'Creating the project...';
        spinner.start();

        const body = { projectId: promptResult.projectId };
        await axios.post(`/v1/projects`, body, APIConfig);

        spinner.succeed('Project created.');

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

  spinner.start('Deploying...');

  logInfo('Project', projectId);
  logInfo('Deploying', projectPath);

  if(platform) {
    logInfo('Platform', platform);    
  } else {
    platform = detectDeploymentType(args, projectPath);
    logInfo('Detected platform', platform);
  }

  debug && console.time('[debug] making hashes')
  const { files, directories, mapHashesToFiles } = await getFiles(projectPath);
  debug && console.log('[debug] files count:', files.length);
  debug && console.timeEnd('[debug] making hashes');

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  logInfo('Project size', bytes(totalBytes));

  debug && console.time('[debug] Ensure app has Dockerfile');
  const { filesWithDockerfile, mapHashesToFilesWithDockerfile } =
    ensureAppHasDockerfile(platform, files, mapHashesToFiles);
  debug && console.timeEnd('[debug] Ensure app has Dockerfile');

  if(!port) {
    port = getPort(platform);
    debug && console.log('[debug] default port:', port);
  }

  const deployment = await retry(async bail => {
    const body = {
      port,
      directories,
      type: platform,
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

  spinner.start('Building...');

  const { releaseId } = deployment;

  const releaseStateEmitter = new EventEmitter();

  const fetchRelease = () => retry(async bail => {
    try {
      const { data: { release } } =
        await axios.get(`/v1/releases/${releaseId}`, APIConfig);

      return release;

    } catch (error) {
      // Retry fetching if the error is an http error
      if (error.response || error.request) {
        debug && console.log('[debug] Retrying fetchRelease...');
        throw error;
      }
      return bail(error);
    }
  });

  const getState = () => {
    setTimeout(async () => {
      const release = await fetchRelease();

      if (release.state === 'READY') {
        releaseStateEmitter.emit('READY');
        return;
      }

      if (release.state === 'CREATING_SERVICE') {
        releaseStateEmitter.emit('CREATING_SERVICE');
      }

      getState();

    }, 3000);
  };

  getState();

  releaseStateEmitter.on('CREATING_SERVICE', () => {
    spinner.text = 'Starting...';
  });

  releaseStateEmitter.on('READY', READY => {
    spinner.stop();

    console.log();
    console.log(green('Deployment finished successfully.'));
    console.log(white('Open up the url below in your browser:'));
    console.log()
    dev
      ? console.log(`    ${cyan(`http://${projectId}.liara.localhost`)}`)
      : console.log(`    ${cyan(`http://${projectId}.liara.run`)}`);
    console.log();
  });
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