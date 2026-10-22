import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import { expect } from 'chai';
import { stubGlobalConfig, stubProcessExit } from '../helpers/stubs.ts';

// A rejected or expired token is handled once for every command: the CLI
// prints the error and exits with code 2, even when the command catches
// request errors itself.
describe('expired or wrong token (401)', function () {
  const unauthorized = { statusCode: 401, message: 'Unauthorized' };

  beforeEach(() => {
    nock.disableNetConnect();
    stubGlobalConfig();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    sinon.restore();
  });

  const expectAuthFailure = async (args: string[]) => {
    const { exited } = stubProcessExit();

    const { stderr } = await runCommand(args);

    expect(await exited).to.equal(2);
    expect(stderr).to.include('Authentication failed.');
    expect(stderr).to.include("Please log in using the 'liara login' command.");
  };

  it('asks to log in again on a command without its own error handling', async () => {
    nock('https://api.liara.ir')
      .get('/v1/projects')
      .query({ teamID: '' })
      .reply(401, unauthorized);

    await expectAuthFailure(['app:list']);
  });

  it('asks to log in again on a command that catches request errors', async () => {
    nock('https://api.liara.ir')
      .post('/v1/projects/test-app/actions/restart')
      .query({ teamID: '' })
      .reply(401, unauthorized);

    await expectAuthFailure(['app:restart', '--app', 'test-app']);
  });

  it('asks to log in again on the object storage service', async () => {
    nock('https://storage-service.liara.ir')
      .delete('/api/v1/buckets/test-bucket')
      .query({ teamID: '' })
      .reply(401, unauthorized);

    await expectAuthFailure([
      'bucket:delete',
      '--bucket',
      'test-bucket',
      '--force',
    ]);
  });

  it('asks to log in again on the vm service', async () => {
    nock('https://iaas-api.liara.ir')
      .get('/vm')
      .query({ teamID: '' })
      .reply(401, unauthorized);

    await expectAuthFailure(['vm:info', '--vm', 'test-vm']);
  });

  it('still sends the team id', async () => {
    nock('https://api.liara.ir')
      .get('/v1/projects')
      .query({ teamID: 'team-1' })
      .reply(401, unauthorized);

    await expectAuthFailure(['app:list', '--team-id', 'team-1']);
  });
});
