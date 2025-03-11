import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import sinon from 'sinon';
import { accounts, currentAccounts } from '../../fixtures/accounts/fixture.ts';
import fs from 'fs-extra';
import path from 'path';
import os from 'node:os';
import AccountUse from '../../../src/commands/account/use.ts';

describe('account:use', async () => {
  let fsStub: sinon.SinonStub;
  let promptAccount: sinon.SinonStub;
  let liaraAuthConfigFile: sinon.SinonStub;

  beforeEach(async () => {
    fsStub = sinon.stub(fs, 'writeFileSync');
    promptAccount = sinon.stub(AccountUse.prototype, 'promptName');
    liaraAuthConfigFile = sinon.stub(AccountUse.prototype, 'readGlobalConfig');
  });

  afterEach(async () => {
    sinon.restore();
  });
  it('should throw an error when the specified account does not exist', async () => {
    liaraAuthConfigFile.resolves({ version: '1', accounts: currentAccounts });

    const { error } = await runCommand([
      'account:use',
      '--account',
      'test5_iran',
    ]);

    expect(error?.message).to.equal(
      'Could not find any account associated with this name test5_iran.',
    );
  });

  it('should switch the current account and persist changes to config', async () => {
    liaraAuthConfigFile.resolves({ version: '1', accounts: currentAccounts });

    const { error } = await runCommand([
      'account:use',
      '--account',
      'test4_iran',
    ]);

    const expectedAccounts = {
      test3_iran: { ...currentAccounts['test3_iran'], current: false },
      test4_iran: { ...currentAccounts['test4_iran'], current: true },
    };

    expect(
      fsStub.calledWithExactly(
        path.join(os.homedir(), '.liara-auth.json'),
        JSON.stringify({ version: '1', accounts: expectedAccounts }),
      ),
    ).to.be.true;
    expect(error).to.be.undefined;
  });

  it('should throw an error if .liara-auth.json does not exist', async () => {
    liaraAuthConfigFile.resolves(undefined);

    const { error } = await runCommand([
      'account:use',
      '--account',
      'test4_iran',
    ]);

    expect(error?.message).to.equal(
      "Please add your accounts via 'liara account:add' command, first.",
    );
  });
});
