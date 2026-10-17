import fs from 'fs-extra';
import chalk from 'chalk';
import open, { apps, AppName } from 'open';
import { Flags } from '@oclif/core';

import Command from '../base.js';
import AccountAdd from './account/add.js';
import AccountUse from './account/use.js';
import IBrowserLogin from '../types/browser-login.js';
import { createDebugLogger } from '../utils/output.js';
import { GLOBAL_CONF_PATH, GLOBAL_CONF_VERSION } from '../constants.js';
import ora from 'ora';

const CONSOLE_LOGIN_URL = 'https://console.liara.ir/login';

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
    this.spinner = ora();
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
      let accounts: IBrowserLogin[] | undefined;

      try {
        accounts = await this.browser(flags.browser);
      } catch (error) {
        debug(`${error.message}\n`);

        this.spinner.fail(
          'Cannot open browser. Browser unavailable or lacks permissions.',
        );
      }

      if (accounts) {
        this.spinner.start('Logging in.');
        const currentAccounts = (await this.readGlobalConfig()).accounts;

        let currentAccount;

        for (const account of accounts) {
          if (!account.email) {
            this.spinner.stop();

            await this.openConsoleLogin(flags.browser).catch((error) =>
              debug(`${error.message}\n`),
            );

            this.error(
              `Your account${account.fullname ? ` (${account.fullname})` : ''} has no email address, which is required to log in with the CLI.
Please add an email to your account at ${CONSOLE_LOGIN_URL} and then run ${chalk.green('liara login')} again.`,
            );
          }

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
      }
    }

    await AccountAdd.run(sendFlag);

    this.log(chalk.green('You have logged in successfully.'));
  }

  async openConsoleLogin(browser?: string) {
    const app = browser ? { app: { name: apps[browser as AppName] } } : {};

    const cp = await open(CONSOLE_LOGIN_URL, app);

    cp.on('error', () => {});
  }
}
