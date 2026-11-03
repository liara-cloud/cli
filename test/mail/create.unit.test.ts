import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import inquirer from 'inquirer';
import { expect } from 'chai';
import { stubGlobalConfig } from '../helpers/stubs.ts';

describe('mail:create', function () {
  const api = nock('https://api.liara.ir');
  const mailApi = nock('https://mail-service.liara.ir');

  beforeEach(() => {
    nock.disableNetConnect();
    stubGlobalConfig();
  });

  afterEach(() => {
    api.done();
    mailApi.done();
    nock.cleanAll();
    nock.enableNetConnect();
    sinon.restore();
  });

  it('does not offer the free plan', async () => {
    api
      .get('/v1/me')
      .query({ teamID: '' })
      .reply(200, {
        plans: { mail: { m1: { available: true }, m2: { available: true } } },
      });
    mailApi
      .post('/api/v1/mails', {
        domain: 'example.com',
        plan: 'm2',
        mode: 'DEV',
      })
      .query({ teamID: '' })
      .reply(200);
    const prompt = sinon.stub(inquirer, 'prompt');
    prompt.onFirstCall().resolves({ plan: 'm2' });
    prompt.onSecondCall().resolves({ mode: 'DEV' });

    await runCommand(['mail:create', '--domain', 'example.com']);

    const { choices } = prompt.firstCall.args[0] as any;
    expect(choices.map((choice: any) => choice.value)).to.deep.equal(['m2']);
  });
});
