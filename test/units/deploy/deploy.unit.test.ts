import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '@oclif/test';
import deploy from '../../../src/commands/deploy.ts';
import nock from 'nock';

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
});
