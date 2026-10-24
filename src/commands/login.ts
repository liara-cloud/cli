import fs from 'fs-extra';
import chalk from 'chalk';
import open, { apps, AppName } from 'open';
import got from 'got';
import { Flags } from '@oclif/core';

import Command, { IAccount } from '../base.js';
import AccountAdd from './account/add.js';
import AccountUse from './account/use.js';
import IBrowserLogin from '../types/browser-login.js';
import { createDebugLogger } from '../utils/output.js';
import {
  GLOBAL_CONF_PATH,
  GLOBAL_CONF_VERSION,
  REGIONS_API_URL,
} from '../constants.js';
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

        // No interceptor hooks here: a rejected token must throw, not exit.
        const api = got.extend({ prefixUrl: REGIONS_API_URL['iran'] });
        const saved: string[] = [];

        for (const account of accounts) {
          const skippedAccount = account?.email || account?.fullname;

          if (!account?.token) {
            this.spinner.stop();
            this.warn(
              `Skipped the account ${skippedAccount} because the console did not send a token for it.`,
            );
            continue;
          }

          let user;

          try {
            ({ user } = await api('v1/me', {
              headers: { Authorization: `Bearer ${account.token}` },
            }).json<{ user: IAccount & { _id: string; phone?: string } }>());
          } catch (error) {
            if (error.response?.statusCode !== 401) {
              throw error;
            }

            this.spinner.stop();
            this.warn(
              `Skipped the account ${skippedAccount} because its token was rejected. Log out of it at ${CONSOLE_LOGIN_URL}, log in again and then run ${chalk.green('liara login')} again.`,
            );
            continue;
          }

          // Accounts without an email, such as phone sign-ups, use their phone or id.
          const name = user.email
            ? user.email.split('@')[0]
            : user.phone || user._id;

          if (account.current) {
            currentAccount = name;
          }

          currentAccounts[name] = {
            email: user.email,
            avatar: account.avatar,
            api_token: account.token,
            fullname: account.fullname,
            current: false,
          };
          saved.push(name);
        }

        if (!saved.length) {
          this.spinner.stop();

          await this.openConsoleLogin(flags.browser).catch((error) =>
            debug(`${error.message}\n`),
          );

          this.error(
            `No valid account was received from the console.
Please log out and log in again at ${CONSOLE_LOGIN_URL} and then run ${chalk.green('liara login')} again.`,
          );
        }

        fs.writeFileSync(
          GLOBAL_CONF_PATH,
          JSON.stringify({
            accounts: currentAccounts,
            version: GLOBAL_CONF_VERSION,
          }),
        );

        this.spinner.succeed('You have logged in successfully.');

        await AccountUse.run(['--account', currentAccount || saved[0]]);

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
