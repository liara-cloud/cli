import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import sinon from 'sinon';
import { accounts } from '../../fixtures/accounts/fixture.ts';
import Login from '../../../src/commands/login.ts';
import fs from 'fs-extra';
import path from 'path';
import os from 'node:os';
import AccountUse from '../../../src/commands/account/use.ts';
import AccountAdd from '../../../src/commands/account/add.ts';

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

  it('should write account infos if .liara-auth.json is empty', async () => {
    sinon
      .stub(Login.prototype, 'readGlobalConfig')
      .resolves({ version: '1', accounts: {} });
    await runCommand(['login']);

    const expectedData = JSON.stringify({
      accounts: {
        [`${accounts[0].email.split('@')[0]}_${accounts[0].region}`]: {
          email: accounts[0].email,
          region: accounts[0].region,
          avatar: accounts[0].avatar,
          api_token: accounts[0].token,
          fullname: accounts[0].fullname,
          current: false,
        },
        [`${accounts[1].email.split('@')[0]}_${accounts[1].region}`]: {
          email: accounts[1].email,
          region: accounts[1].region,
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

  it('should write account infos if .liara-auth.json is not empty', async () => {
    const accountObj = accounts.slice(2, 4).reduce((acc, account) => {
      acc[`${account.email.split('@')[0]}_${account.region}`] = account;
      return acc;
    }, {});

    sinon
      .stub(Login.prototype, 'readGlobalConfig')
      .resolves({ version: '1', accounts: accountObj });

    await runCommand(['login']);

    const expectedAccounts = {
      ...accountObj,
      [`${accounts[0].email.split('@')[0]}_${accounts[0].region}`]: {
        email: accounts[0].email,
        region: accounts[0].region,
        avatar: accounts[0].avatar,
        api_token: accounts[0].token,
        fullname: accounts[0].fullname,
        current: false,
      },
      [`${accounts[1].email.split('@')[0]}_${accounts[1].region}`]: {
        email: accounts[1].email,
        region: accounts[1].region,
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
  it('should pass the flags to account add command if -i flag is used', async () => {
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
