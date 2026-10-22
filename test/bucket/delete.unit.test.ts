import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import { expect } from 'chai';
import { stubGlobalConfig } from '../helpers/stubs.ts';
import BucketDelete from '../../src/commands/bucket/delete.ts';

describe('bucket:delete', function () {
  const api = nock('https://storage-service.liara.ir');

  const expectDelete = () =>
    api.delete('/api/v1/buckets/test-bucket').query({ teamID: '' });

  beforeEach(() => {
    nock.disableNetConnect();
    stubGlobalConfig();
  });

  afterEach(() => {
    api.done();
    nock.cleanAll();
    nock.enableNetConnect();
    sinon.restore();
  });

  it('deletes the bucket with --force', async () => {
    expectDelete().reply(200);

    const { stdout, error } = await runCommand([
      'bucket:delete',
      '--bucket',
      'test-bucket',
      '--force',
    ]);

    expect(error).to.equal(undefined);
    expect(stdout).to.equal('Bucket test-bucket deleted.\n');
  });

  it('deletes the bucket after confirmation', async () => {
    sinon.stub(BucketDelete.prototype, 'confirm').resolves(true);
    expectDelete().reply(200);

    const { stdout } = await runCommand([
      'bucket:delete',
      '--bucket',
      'test-bucket',
    ]);

    expect(stdout).to.equal('Bucket test-bucket deleted.\n');
  });

  it('does not delete the bucket without confirmation', async () => {
    sinon.stub(BucketDelete.prototype, 'confirm').resolves(false);

    const { stdout, error } = await runCommand([
      'bucket:delete',
      '--bucket',
      'test-bucket',
    ]);

    expect(error).to.equal(undefined);
    expect(stdout).to.equal('');
  });

  for (const [status, message] of [
    [404, 'Could not find the bucket.'],
    [409, 'Another operation is already running. Please wait.'],
    // got retries DELETE requests on 5xx, so use a status it does not retry.
    [400, 'Could not delete the bucket. Please try again.'],
  ] as const) {
    it(`throws "${message}" for a ${status} response`, async () => {
      expectDelete().reply(status);

      const { error } = await runCommand([
        'bucket:delete',
        '--bucket',
        'test-bucket',
        '--force',
      ]);

      expect(error?.message).to.equal(message);
    });
  }
});
