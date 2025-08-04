import fs from 'fs-extra';
import chalk from 'chalk';
import { Flags } from '@oclif/core';

import Command from '../base.js';
import AccountAdd from './account/add.js';
import AccountUse from './account/use.js';
import { createDebugLogger } from '../utils/output.js';
import { GLOBAL_CONF_PATH, GLOBAL_CONF_VERSION } from '../constants.js';

export default class Login extends Command {
  static description = 'login to your account';

  static flags = {
    ...Command.flags,
    email: Flags.string({ char: 'e', description: 'your email' }),
    password: Flags.string({ char: 'p', description: 'your password' }),
    interactive: Flags.boolean({
      char: 'i',
      description: 'login with username/password',
      default: false,
    }),
    browser: Flags.string({
      description: 'browser to open',
      options: ['chrome', 'firefox', 'edge'],
    }),
  };

  async run() {
    const { flags } = await this.parse(Login);
    const debug = createDebugLogger(flags.debug);

    const sendFlag = [
      '--api-token',
      flags['api-token'] || '',
      '--email',
      flags.email || '',
      '--password',
      flags.password || '',
      '--from-login',
    ];

    if (flags.interactive === false && !flags['api-token']) {
      try {
        const accounts = await this.browser(flags.browser);

        this.spinner.start('Logging in.');
        const currentAccounts = (await this.readGlobalConfig()).accounts;

        let currentAccount;

        for (const account of accounts) {
          const name = `${account.email.split('@')[0]}`;

          if (account.current) {
            currentAccount = name;
          }

          currentAccounts[name] = {
            email: account.email,
            avatar: account.avatar,
            api_token: account.token,
            fullname: account.fullname,
            current: false,
          };
        }

        fs.writeFileSync(
          GLOBAL_CONF_PATH,
          JSON.stringify({
            accounts: currentAccounts,
            version: GLOBAL_CONF_VERSION,
          }),
        );

        this.spinner.succeed('You have logged in successfully.');

        currentAccount && (await AccountUse.run(['--account', currentAccount]));

        const { accountName } = await this.getCurrentAccount();

        this.log(`> Auth credentials saved in ${chalk.bold(GLOBAL_CONF_PATH)}`);

        accountName && this.log(`> Current account is: ${accountName}`);

        return;
      } catch (error) {
        debug(`${error.message}\n`);

        this.spinner.fail(
          'Cannot open browser. Browser unavailable or lacks permissions.',
        );
      }
    }

    await AccountAdd.run(sendFlag);

    this.log(chalk.green('You have logged in successfully.'));
  }
}
