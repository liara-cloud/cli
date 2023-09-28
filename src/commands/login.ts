import fs from 'fs-extra';
import chalk from 'chalk';
import { Flags } from '@oclif/core';

import Command from '../base.js';
import AccountAdd from './account/add.js';
import AccountUse from './account/use.js';
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
    }),
    browser: Flags.string({
      description: 'browser to open',
      options: ['chrome', 'firefox', 'edge'],
      default: 'browser', // default browser
    }),
  };

  async run() {
    const { flags } = await this.parse(Login);

    const sendFlag = [
      '--api-token',
      flags['api-token'] || '',
      '--email',
      flags.email || '',
      '--password',
      flags.password || '',
      '--from-login',
    ];

    if (flags.region) {
      sendFlag.push('--region', flags.region);
      this.log(`You're logging into "${flags.region}" region:`);
    }

    if (!flags.interactive) {
      const accounts = await this.browser(flags.browser);

      const currentAccounts = (await this.readGlobalConfig()).accounts;

      let currentAccount;

      for (const account of accounts) {
        const name = `${account.email.split('@')[0]}_${account.region}`;

        if (account.current) {
          currentAccount = name;
        }

        currentAccounts[name] = {
          email: account.email,
          region: account.region,
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
        })
      );

      currentAccount && (await AccountUse.run(['--account', currentAccount]));

      const { accountName } = await this.getCurrentAccount();

      this.log(`> Auth credentials saved in ${chalk.bold(GLOBAL_CONF_PATH)}`);

      accountName && this.log(`> Current account is: ${accountName}`);
    } else {
      await AccountAdd.run(sendFlag);
    }

    this.log(chalk.green('You have logged in successfully.'));
  }
}
