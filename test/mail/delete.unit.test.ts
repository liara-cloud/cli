import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import { expect } from 'chai';
import { stubGlobalConfig } from '../helpers/stubs.ts';
import MailDelete from '../../src/commands/mail/delete.ts';

const mails = {
  status: 'success',
  data: {
    mailServers: [
      { id: 'mail-1', domain: 'example.com' },
      { id: 'mail-2', domain: 'example.org' },
    ],
  },
};

describe('mail:delete', function () {
  const api = nock('https://mail-service.liara.ir');

  const expectMails = () =>
    api.get('/api/v1/mails').query({ teamID: '' }).reply(200, mails);

  const expectDelete = () =>
    api.delete('/api/v1/mails/mail-1').query({ teamID: '' });

  beforeEach(() => {
    nock.disableNetConnect();
    stubGlobalConfig();
    // The command always asks for the mail server, even with --mail.
    sinon.stub(MailDelete.prototype, 'promptMails').resolves('example.com');
  });

  afterEach(() => {
    api.done();
    nock.cleanAll();
    nock.enableNetConnect();
    sinon.restore();
  });

  it('deletes the selected mail server with --force', async () => {
    expectMails();
    expectDelete().reply(200);

    const { stdout, error } = await runCommand(['mail:delete', '--force']);

    expect(error).to.equal(undefined);
    expect(stdout).to.equal('Mail server example.com deleted.\n');
  });

  it('does not delete the mail server without confirmation', async () => {
    sinon.stub(MailDelete.prototype, 'confirm').resolves(false);
    expectMails();

    const { stdout, error } = await runCommand(['mail:delete']);

    expect(error).to.equal(undefined);
    expect(stdout).to.equal('');
  });

  for (const [status, message] of [
    [404, 'Could not find the mail server.'],
    [409, 'Another operation is already running. Please wait.'],
    // got retries DELETE requests on 5xx, so use a status it does not retry.
    [400, 'Could not delete the mail server. Please try again.'],
  ] as const) {
    it(`throws "${message}" for a ${status} response`, async () => {
      expectMails();
      expectDelete().reply(status);

      const { error } = await runCommand(['mail:delete', '--force']);

      expect(error?.message).to.equal(message);
    });
  }
});
