import ora from 'ora';
import axios from 'axios';
import bytes from 'bytes';
import { tmpdir } from 'os';
import request from 'request';
import archiver from 'archiver';
import retry from 'async-retry';
import EventEmitter from 'events';
import { prompt } from 'inquirer';
import ProgressBar from 'progress';
import concat from 'concat-stream';
import { isAbsolute, join } from 'path';
import followRedirects from 'follow-redirects';
import { white, cyan, gray, green, red } from 'chalk';
import fs, { existsSync, readJSONSync } from 'fs-extra';

import showError from '../util/error';
import auth from '../middlewares/auth';
import getFiles from '../util/get-files';
import getPort from '../util/get-port';
import detectDeploymentType from '../util/detect-deployment-type';
import ensureAppHasDockerfile from '../util/ensure-has-dockerfile';

followRedirects.maxBodyLength = 200 * 1024 * 1024; // 200 MB

export default auth(async function deploy(args, config) {
  const spinner = ora('Loading projects...').start();

  const { project, path, debug, dev } = args;

  let port;
  let platform;
  let mountPoint;
  let projectId = typeof project === 'boolean' ? null : project;
  const projectPath = path ? path : process.cwd();
  const liaraJSONPath = join(projectPath, 'liara.json');

  const APIConfig = {
    baseURL: config.apiURL,
    headers: {
      Authorization: `Bearer ${config.api_token}`,
    }
  };

  const clearAndLog = (...texts) => {
    spinner.clear();
    spinner.frame();
    console.log(...texts);
  }

  const logInfo = (title, value) => {
    clearAndLog(`${gray(`${title}:`)} ${value}`);
  }

  const hasLiaraJSONFile = existsSync(liaraJSONPath);
  if (hasLiaraJSONFile) {
    let liaraJSON;

    try {
      liaraJSON = readJSONSync(liaraJSONPath) || {};
    } catch (error) {
      throw new Error('Syntax error in `liara.json`!');
    }

    if (!project) {
      projectId = liaraJSON.project;
    }

    if (liaraJSON.port) {
      port = Number(liaraJSON.port);
      if (isNaN(port)) {
        throw new TypeError('The `port` field in `liara.json` must be a number.');
      }
    }

    platform = liaraJSON.platform;
    if (platform && typeof platform !== 'string') {
      throw new TypeError('The `platform` field in `liara.json` must be a string.');
    }

    if(liaraJSON.volume) {
      mountPoint = liaraJSON.volume;

      if( ! isAbsolute(mountPoint)) {
        throw new Error('The `volume` field in `liara.json` must be an absolute path.');
      }
    }
  }

  if (!projectId) {
    let promptResult;

    const { data: { projects } } = await axios.get(`/v1/projects`, APIConfig);

    spinner.stop();

    if ( ! projects.length) {
      console.info('Please go to https://console.liara.ir/projects and create a project, first.');
      process.exit(1);

    } else {
      promptResult = await prompt({
        name: 'projectId',
        type: 'list',
        message: 'Please select a project:',
        choices: [
          ...projects.map(project => project.project_id),
        ]
      });
    }

    projectId = promptResult.projectId;
  }

  logInfo('Project', projectId);
  logInfo('Deploying', projectPath);

  if (platform) {
    logInfo('Platform', platform);

  } else {
    try {
      platform = detectDeploymentType(args, projectPath);
      logInfo('Detected platform', platform);

    } catch (error) {
      console.log(red('> Error!'), error.message);
      process.exit(1);
    }
  }

  if(platform === 'node') {
    const packageJSON = readJSONSync(join(projectPath, 'package.json'));

    if( ! packageJSON.scripts || ! packageJSON.scripts.start) {
      showError('A NodeJS project must be runnable with `npm start`.');
      console.info('You must add a `start` command to your package.json scripts.');
      process.exit(1);
    }
  }

  if(port) {
    logInfo('Port', port);

  } else {
    port = getPort(platform);

    if(port) {
      logInfo('Default port', port);

    } else {
      const promptResult = await prompt({
        name: 'port',
        type: 'input',
        default: 3000,
        message: 'Enter the port your app listens to:',
        validate(input) {
          input = Number(input);
          if ( ! input) {
            return 'Port must be a number.';
          }
          if ( ! Number.isInteger(input)) {
            return 'Port must be an integer.';
          }
          return true;
        }
      });

      port = promptResult.port;
    }
  }

  spinner.start('Compressing...');

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

  try {
    await retry(async bail => {
      const body = {
        port,
        mountPoint,
        directories,
        type: platform,
        project: projectId,
        files: filesWithDockerfile,
      };
  
      const url = `/v1/projects/${projectId}/releases`;
  
      try {
        debug && console.time('stream');
        debug && console.log('[debug] Calling', url, '...');

        const { data: stream } = await axios.post(url, body, {
          ...APIConfig,
          responseType: 'stream'
        });
  
        spinner.start('Building...');

        const buildEvents = new EventEmitter;

        let tmp = '';
        stream.on('data', data => {
          tmp += tmp ? data : data.toString().slice(6);

          try {
            const obj = JSON.parse(tmp);
            buildEvents.emit('data', obj);
            tmp = '';

          } catch(_) {
            // JSON.parse may fail if JSON is not complete yet
          }
        });
  
        buildEvents
          .on('data', line => {
            if (line.state === 'BUILD_FINISHED') {
              spinner.succeed('Build finished.');
              spinner.start('Pushing the image...');
              return;
            }
  
            if (line.state === 'CREATING_SERVICE') {
              spinner.succeed('Image pushed.');
              spinner.start('Starting the service...');
              return;
            }
  
            if (line.state === 'FAILED') {
              spinner.stop();
  
              console.log();
              console.log(red('Deployment failed :('));
              console.log('Please try again later or contact us.');
              console.log();

              return;
            }
  
            if (line.state === 'READY') {
              spinner.stop();
  
              console.log();
              console.log(green('Deployment finished successfully.'));
              console.log(white('Open up the url below in your browser:'));
              console.log()
              dev
                ? console.log(`    ${cyan(`http://${projectId}.liara.localhost`)}`)
                : console.log(`    ${cyan(`https://${projectId}.liara.run`)}`);
              console.log();
  
              return;
            }
  
            if(line.message) {
              clearAndLog(cyan('>'), line.message.trim());
              return;
            }

            console.log(line);
          })
          .on('end', () => {
            debug && console.log('Stream finished.');
            debug && console.timeEnd('stream');
          });
  
      }
      catch (error) {
        debug && console.log('[debug]', error.message);

        const { response } = error;
  
        // Unknown error
        if (!response) return bail(error);
  
        const data = await new Promise(resolve => {
          error.response.data.pipe(
            concat({ encoding: 'string' }, data => {
              resolve(JSON.parse(data))
            })
          );
        });

        if(response.status === 402) {
          spinner.fail(`You don't have enough balance. Payment required.`);
          process.exit(1);
        }

        if(response.status === 400 && data.message === 'frozen_project') {
          spinner.fail(`Project is frozen (not enough balance).
Please open up https://console.liara.ir/projects and unfreeze the project.`);
          process.exit(1);
        }

        if (response.status === 400 && data.message === 'missing_files') {
          const { missing_files } = data;
  
          debug && console.log(`[debug] missing files: ${missing_files.length}`);
    
          await uploadMissingFiles(
            mapHashesToFilesWithDockerfile,
            missing_files,
            config,
            spinner,
          );
    
          throw error; // retry deployment
        }
  
        if (response.status >= 400 && response.status < 500) {
          return bail(error);
        }
      }
  
    }, {
        onRetry(error) {
          debug && console.log('[debug] Retrying deployment, error:');
          debug && console.log('[debug]', error.message);
        }
      });
  } catch (error) {
    debug && console.error(error);
    spinner.fail(error.message);
    console.info('Sorry for inconvenience. Please contact us.');
  }
});

async function uploadMissingFiles(mapHashesToFiles, missing_files, config, spinner) {
  const archive = archiver('tar', {
    gzip: true,
    gzipOptions: { level: 9 },
  });

  archive.on('error', function(err) {
    throw err;
  });

  for(const hash of missing_files) {
    const { data } = mapHashesToFiles.get(hash);
    archive.append(data, { name: hash });
  }

  archive.finalize();
  spinner.stop();

  const tmpArchivePath = join(tmpdir(), `${Date.now()}.tar.gz`);

  const archiveSize = await new Promise((resolve, reject) => {
    archive.pipe(fs.createWriteStream(tmpArchivePath))
      .on('error', reject)
      .on('close', function () {
        const { size } = fs.statSync(tmpArchivePath);
        resolve(size);
      });
  });

  console.log(`${gray('Compressed size:')} ${bytes(archiveSize)}`);

  const tmpArchiveStream = fs.createReadStream(tmpArchivePath);
  const bar = new ProgressBar('Uploading [:bar] :rate/bps :percent :etas', { total: archiveSize });

  return new Promise(resolve => {
    const req = request.post({
      url: '/v1/files/archive',
      baseUrl: config.apiURL,
      data: tmpArchiveStream,
      headers: {
        'Content-Type': 'application/octet-stream',
        Authorization: `Bearer ${config.api_token}`,
      },
    });

    const interval = setInterval(function () {
      bar.tick(req.req.connection._bytesDispatched - bar.curr);

      if(bar.complete) {
        spinner.succeed('Upload finished.');
        spinner.start('Extracting...');
        clearInterval(interval);
      }
    }, 250);

    tmpArchiveStream.pipe(req)
      .on('response', () => {
        spinner.succeed('Extract finished.');
        spinner.start('Deploying...');
        fs.unlink(tmpArchivePath);
        resolve();
      });
  });

}