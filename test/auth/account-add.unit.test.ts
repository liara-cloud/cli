import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import nock from 'nock';
import sinon from 'sinon';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import os from 'node:os';
import AccountAdd from '../../src/commands/account/add.ts';

describe('account:add', async () => {
  let fsStub: sinon.SinonStub;
  let promptStub: sinon.SinonStub;

  const mockMe = (user: object) =>
    nock('https://api.liara.ir')
      .get('/v1/me')
      .matchHeader('authorization', 'Bearer token')
      .reply(200, { user });

  const mockCheckIfExists = (status: object = {}) =>
    nock('https://api.liara.ir')
      .post('/v1/login/check-if-exists', { email: 'jane@example.com' })
      .reply(200, {
        status: 'success',
        exists: true,
        socialCompleted: true,
        twoFAEnabled: false,
        ...status,
      });

  const passwordLogin = () =>
    runCommand([
      'account:add',
      '--email',
      'jane@example.com',
      '--password',
      'secret',
    ]);

  const expectedFile = (name: string, email: string | null) =>
    JSON.stringify({
      accounts: {
        [name]: {
          email,
          api_token: 'token',
          fullname: 'No Email',
          avatar: '',
          current: false,
        },
      },
      version: '1',
    });

  beforeEach(() => {
    nock.disableNetConnect();
    fsStub = sinon.stub(fs, 'writeFileSync');
    sinon
      .stub(AccountAdd.prototype, 'readGlobalConfig')
      .resolves({ version: '1', accounts: {} });
    promptStub = sinon
      .stub(inquirer, 'prompt')
      .callsFake(async (q: any) => ({ name: q.default }));
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    sinon.restore();
  });

  it('should name an api-token account without an email by its phone number', async () => {
    mockMe({
      _id: 'u1',
      email: null,
      phone: '09120000000',
      fullname: 'No Email',
      avatar: '',
    });

    const { error } = await runCommand(['account:add', '--api-token', 'token']);

    expect(error).to.be.undefined;
    expect(promptStub.firstCall.args[0].default).to.equal('09120000000');
    expect(
      fsStub.calledWithExactly(
        path.join(os.homedir(), '.liara-auth.json'),
        expectedFile('09120000000', null),
      ),
    ).to.be.true;
  });

  it('should default the api-token account name to the email local part', async () => {
    mockMe({
      _id: 'u1',
      email: 'jane@example.com',
      fullname: 'No Email',
      avatar: '',
    });

    const { error } = await runCommand(['account:add', '--api-token', 'token']);

    expect(error).to.be.undefined;
    expect(promptStub.firstCall.args[0].default).to.equal('jane');
    expect(
      fsStub.calledWithExactly(
        path.join(os.homedir(), '.liara-auth.json'),
        expectedFile('jane', 'jane@example.com'),
      ),
    ).to.be.true;
  });

  it('should save the email of a password login, which the login response leaves out', async () => {
    mockCheckIfExists();
    nock('https://api.liara.ir')
      .post('/v1/login', { email: 'jane@example.com', password: 'secret' })
      .query({ expiresIn: '1y' })
      .reply(200, { api_token: 'token', fullname: 'No Email', avatar: '' });

    const { error } = await passwordLogin();

    expect(error).to.be.undefined;
    expect(
      fsStub.calledWithExactly(
        path.join(os.homedir(), '.liara-auth.json'),
        expectedFile('jane', 'jane@example.com'),
      ),
    ).to.be.true;
  });

  it("should say when the email isn't registered", async () => {
    mockCheckIfExists({ exists: false, socialCompleted: false });

    const { error } = await passwordLogin();

    expect(error?.message).to.contain(
      'The email you entered isn’t registered.',
    );
    expect(fsStub.called).to.be.false;
  });

  it('should say when the account has no password, such as an OAuth sign-up', async () => {
    mockCheckIfExists({ socialCompleted: false });

    const { error } = await passwordLogin();

    expect(error?.message).to.contain('No password is set for this account.');
    expect(fsStub.called).to.be.false;
  });
});
