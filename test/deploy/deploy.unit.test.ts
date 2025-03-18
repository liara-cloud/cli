import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '@oclif/test';
import deploy from '../../src/commands/deploy.ts';
import nock from 'nock';
import {
  projects,
  getNodeProject,
  getDockerProject,
} from '../fixtures/projects/fixture.ts';

describe('deploy', () => {
  const api = nock('https://api.iran.liara.ir');

  let getConfigs: sinon.SinonStub;
  beforeEach(() => {
    getConfigs = sinon.stub(deploy.prototype, 'getMergedConfig');
  });
  afterEach(() => {
    sinon.restore();
  });
  it('should thorw an error when project path is empty and image flag is specified', async () => {
    getConfigs.returns({ path: 'test/fixtures/empty-project' });

    const { error } = await runCommand(['deploy']);

    expect(error?.message).to.equal('Directory is empty!');
  });

  it('should throw an error if healthcheck in specefied but healthcheck command is not', async () => {
    getConfigs.returns({ healthCheck: {}, path: 'test/fixtures/nodejs-app' });

    const { error } = await runCommand(['deploy']);

    expect(error?.message).to.equal(
      '`command` field in healthCheck is required.',
    );
  });

  it('should throw an error if cache config is not a boolean', async () => {
    getConfigs.returns({
      build: {
        cache: 'string',
      },
      path: 'test/fixtures/nodejs-app',
    });

    const { error } = await runCommand(['deploy']);

    expect(error?.message).to.equal(
      '`cache` parameter field must be a boolean.',
    );
  });

  it('should throw an error if platform is node and start command is not provided in package.json.', async () => {
    getConfigs.returns({
      platform: 'node',
      path: 'test/fixtures/nodejs-app',
      app: getNodeProject.project.project_id,
    });

    api
      .get(`/v1/projects/${getNodeProject.project.project_id}`)
      .query({ teamID: '' })
      .reply(200, getNodeProject);

    const { stdout } = await runCommand(['deploy', '--debug']);
    expect(stdout).to.contains(
      `Error: A NodeJS app must be runnable with 'npm start'`,
    );
  });

  it('should create a release if platform is docker.', async () => {
    getConfigs.returns({
      path: 'test/fixtures/docker-platform/',
      app: 'testdocker',
      image: 'getmeili/meilisearch:v0.28',
      port: 7700,
      disks: [{ name: 'data', mountTo: '/meili_data' }],
      platform: 'docker',
      detach: true,
      'no-app-logs': false,
      args: undefined,
    });
    api
      .get('/v1/projects/testdocker')
      .query({ teamID: '' })
      .reply(200, getDockerProject);

    api
      .post('/v2/projects/testdocker/releases', {
        build: {
          cache: true,
          args: undefined,
          dockerfile: undefined,
          location: undefined,
        },
        cron: undefined,
        args: undefined,
        port: 7700,
        type: 'docker',
        message: undefined,
        disks: [
          {
            name: 'data',
            mountTo: '/meili_data',
          },
        ],
        image: 'getmeili/meilisearch:v0.28',
      })
      .query({ teamID: '' })
      .reply(200, { releaseID: '6rqwrqwrqweBwd34124314' });

    const { stdout } = await runCommand([
      'deploy',
      '--debug',
      '--detach',
      '--platform',
      'docker',
      '--path',
      'test/fixtures/docker-platform',
    ]);

    expect(stdout).to.match(/Disks:\s+data -> \/meili_data/);
    expect(stdout).to.match(
      /\[debug\] \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] Using Build Cache: Enabled/,
    );
    expect(stdout).to.contain('App: testdocker');
    expect(stdout).to.contain('Path: test/fixtures/docker-platform/');
    expect(stdout).to.contain('Platform: docker');
    expect(stdout).to.contain('Port: 7700');
    expect(stdout).to.contain('Deployment created successfully.');
  });
});
