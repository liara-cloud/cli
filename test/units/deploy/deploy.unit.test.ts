import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '@oclif/test';
import deploy from '../../../src/commands/deploy.ts';
import nock from 'nock';
import { projects, getNodeProject } from '../../fixtures/projects/fixture.ts';

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
});
