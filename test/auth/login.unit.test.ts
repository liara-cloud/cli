import { runCommand } from '@oclif/test';
import { expect } from 'chai';
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

  beforeEach(() => {
    AccountUseStub = sinon.stub(AccountUse.prototype, 'run');
    AccountAddStub = sinon.stub(AccountAdd.prototype, 'run');
    browserStub = sinon
      .stub(Login.prototype, 'browser')
      .resolves(accounts.slice(0, 2));
    fsStub = sinon.stub(fs, 'writeFileSync');
  });

  afterEach(() => {
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
    sinon
      .stub(Login.prototype, 'readGlobalConfig')
      .resolves({ version: '1', accounts: {} });

    await runCommand(['login']);

    const currentAccount = accounts.find((data) => data.current);
    const currentAccountName = `${currentAccount!.email.split('@')[0]}_${currentAccount!.region}`;

    expect(AccountUseStub.calledWithExactly(currentAccountName));
  });
  it('should redirect to console login and not save accounts when an account has no email', async () => {
    browserStub.resolves([accounts[0], { ...accounts[1], email: null }]);
    sinon
      .stub(Login.prototype, 'readGlobalConfig')
      .resolves({ version: '1', accounts: {} });
    const openConsoleLoginStub = sinon
      .stub(Login.prototype, 'openConsoleLogin')
      .resolves();

    const { error } = await runCommand(['login']);

    expect(error?.message).to.contain('has no email address');
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
