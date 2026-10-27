import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import nock from 'nock';
import sinon from 'sinon';
import { accounts, currentAccounts } from '../fixtures/accounts/fixture.ts';
import Login from '../../src/commands/login.ts';
import fs from 'fs-extra';
import path from 'path';
import os from 'node:os';
import AccountUse from '../../src/commands/account/use.ts';
import AccountAdd from '../../src/commands/account/add.ts';

describe('login', async () => {
  let fsStub: sinon.SinonStub;
  let browserStub: sinon.SinonStub;
  let AccountUseStub: sinon.SinonStub;
  let AccountAddStub: sinon.SinonStub;

  const mockMe = (token: string, user: object) =>
    nock('https://api.liara.ir')
      .get('/v1/me')
      .matchHeader('authorization', `Bearer ${token}`)
      .reply(200, { user });

  const meOf = (account: (typeof accounts)[number]) => ({
    _id: 'id',
    email: account.email,
    fullname: account.fullname,
    avatar: account.avatar,
  });

  beforeEach(() => {
    nock.disableNetConnect();
    mockMe(accounts[0].token, meOf(accounts[0]));
    mockMe(accounts[1].token, meOf(accounts[1]));
    AccountUseStub = sinon.stub(AccountUse.prototype, 'run');
    AccountAddStub = sinon.stub(AccountAdd.prototype, 'run');
    browserStub = sinon
      .stub(Login.prototype, 'browser')
      .resolves(accounts.slice(0, 2));
    fsStub = sinon.stub(fs, 'writeFileSync');
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    sinon.restore();
  });

  it('should create a new config file with accounts when none exist', async () => {
    sinon
      .stub(Login.prototype, 'readGlobalConfig')
      .resolves({ version: '1', accounts: {} });
    await runCommand(['login']);

    const expectedData = JSON.stringify({
      accounts: {
        [`${accounts[0].email.split('@')[0]}`]: {
          email: accounts[0].email,
          avatar: accounts[0].avatar,
          api_token: accounts[0].token,
          fullname: accounts[0].fullname,
          current: false,
        },
        [`${accounts[1].email.split('@')[0]}`]: {
          email: accounts[1].email,
          avatar: accounts[1].avatar,
          api_token: accounts[1].token,
          fullname: accounts[1].fullname,
          current: false,
        },
      },
      version: '1',
    });
    expect(
      fsStub.calledWithExactly(
        path.join(os.homedir(), '.liara-auth.json'),
        expectedData,
      ),
    ).to.be.true;
  });

  it('should merge new accounts into existing config without overwriting', async () => {
    sinon
      .stub(Login.prototype, 'readGlobalConfig')
      .resolves({ version: '1', accounts: currentAccounts });

    await runCommand(['login']);

    const expectedAccounts = {
      ...currentAccounts,
      [`${accounts[0].email.split('@')[0]}`]: {
        email: accounts[0].email,
        avatar: accounts[0].avatar,
        api_token: accounts[0].token,
        fullname: accounts[0].fullname,
        current: false,
      },
      [`${accounts[1].email.split('@')[0]}`]: {
        email: accounts[1].email,
        avatar: accounts[1].avatar,
        api_token: accounts[1].token,
        fullname: accounts[1].fullname,
        current: false,
      },
    };

    const expectedData = JSON.stringify({
      accounts: expectedAccounts,
      version: '1',
    });

    expect(
      fsStub.calledWithExactly(
        path.join(os.homedir(), '.liara-auth.json'),
        expectedData,
      ),
    ).to.be.true;
  });
  it('should pass the current account to account use command', async () => {
    browserStub.resolves([accounts[0], accounts[2]]);
    mockMe(accounts[2].token, meOf(accounts[2]));
    sinon
      .stub(Login.prototype, 'readGlobalConfig')
      .resolves({ version: '1', accounts: {} });

    await runCommand(['login']);

    expect(AccountUseStub.firstCall.thisValue.argv).to.deep.equal([
      '--account',
      'test3',
    ]);
  });
  it('should log in an account without an email under its phone number', async () => {
    nock.cleanAll();
    mockMe(accounts[0].token, meOf(accounts[0]));
    mockMe(accounts[1].token, {
      _id: 'u2',
      email: null,
      phone: '09120000000',
      fullname: accounts[1].fullname,
      avatar: accounts[1].avatar,
    });
    browserStub.resolves([accounts[0], { ...accounts[1], email: null }]);
    sinon
      .stub(Login.prototype, 'readGlobalConfig')
      .resolves({ version: '1', accounts: {} });

    const { error } = await runCommand(['login']);

    expect(error).to.be.undefined;
    const written = JSON.parse(fsStub.firstCall.args[1]);
    expect(written.accounts['09120000000']).to.deep.equal({
      email: null,
      avatar: accounts[1].avatar,
      api_token: accounts[1].token,
      fullname: accounts[1].fullname,
      current: false,
    });
  });
  it('should take the email from v1/me when the console sent an empty one', async () => {
    browserStub.resolves([{ ...accounts[1], email: '' }]);
    sinon
      .stub(Login.prototype, 'readGlobalConfig')
      .resolves({ version: '1', accounts: {} });

    const { error } = await runCommand(['login']);

    expect(error).to.be.undefined;
    const written = JSON.parse(fsStub.firstCall.args[1]);
    expect(Object.keys(written.accounts)).to.deep.equal(['test2']);
    expect(written.accounts.test2.email).to.equal('test2@gmail.com');
  });
  it('should skip an account whose token is rejected', async () => {
    nock.cleanAll();
    nock('https://api.liara.ir')
      .get('/v1/me')
      .matchHeader('authorization', `Bearer ${accounts[0].token}`)
      .reply(401, {});
    mockMe(accounts[1].token, meOf(accounts[1]));
    browserStub.resolves([{ ...accounts[0], current: true }, accounts[1]]);
    sinon
      .stub(Login.prototype, 'readGlobalConfig')
      .resolves({ version: '1', accounts: {} });

    const { error, stderr } = await runCommand(['login']);

    expect(error).to.be.undefined;
    expect(stderr).to.contain(accounts[0].email);
    const written = JSON.parse(fsStub.firstCall.args[1]);
    expect(Object.keys(written.accounts)).to.deep.equal(['test2']);
    expect(AccountUseStub.firstCall.thisValue.argv).to.deep.equal([
      '--account',
      'test2',
    ]);
  });
  it('should fail without saving when no account has a valid token', async () => {
    browserStub.resolves([{ ...accounts[0], token: '' }]);
    sinon
      .stub(Login.prototype, 'readGlobalConfig')
      .resolves({ version: '1', accounts: {} });
    const openConsoleLoginStub = sinon
      .stub(Login.prototype, 'openConsoleLogin')
      .resolves();

    const { error } = await runCommand(['login']);

    expect(error?.message).to.contain('https://console.liara.ir/login');
    expect(openConsoleLoginStub.calledOnce).to.be.true;
    expect(fsStub.called).to.be.false;
    expect(AccountAddStub.called).to.be.false;
  });
  it('should fall back to account:add when the browser cannot be opened', async () => {
    browserStub.rejects(new Error('spawn ENOENT'));

    await runCommand(['login']);

    expect(AccountAddStub.calledOnce).to.be.true;
    expect(fsStub.called).to.be.false;
  });
  it('should delegate credentials to account:add in interactive mode (-i)', async () => {
    await runCommand([
      'login',
      '-i',
      `--email ${accounts[0].email}`,
      `--password 123456`,
    ]);

    expect(
      AccountAddStub.calledWithExactly([
        '--api-token',
        '',
        '--email',
        accounts[0].email,
        '--password',
        '',
        123456,
      ]),
    );
  });
});
