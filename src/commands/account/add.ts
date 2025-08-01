import got from 'got';
import chalk from 'chalk';
import fs, { exists } from 'fs-extra';
import retry from 'async-retry';
import inquirer from 'inquirer';
import { Flags } from '@oclif/core';
import promptEmail from 'email-prompt-ts';
import { validate as validateEmail } from 'email-validator';

import AccountUse from './use.js';
import hooks from '../../interceptors.js';
import Command, { IAccount, IAccounts } from '../../base.js';
import eraseLines from '../../utils/erase-lines.js';
import { createDebugLogger, DebugLogger } from '../../utils/output.js';

import {
  FALLBACK_REGION,
  REGIONS_API_URL,
  GLOBAL_CONF_PATH,
  GLOBAL_CONF_VERSION,
} from '../../constants.js';

export default class AccountAdd extends Command {
  static description = 'add an account';

  static flags = {
    ...Command.flags,
    email: Flags.string({ char: 'e', description: 'your email' }),
    password: Flags.string({ char: 'p', description: 'your password' }),
    account: Flags.string({
      char: 'a',
      description: 'account name',
      required: false,
    }),
    'from-login': Flags.boolean({
      required: false,
      hidden: true,
      default: false,
    }),
  };

  async run() {
    const { flags } = await this.parse(AccountAdd);
    const debug = createDebugLogger(flags.debug);
    const liara_json = await this.readGlobalConfig();
    const currentAccounts = liara_json.accounts;

    this.got = got.extend({ prefixUrl: REGIONS_API_URL['iran'], hooks });

    // first we need to check if we have api token,
    // if /me gives user, its all good, if i should give answer and prompt the credentials
    // then we need to check if he has email flag or password flag
    // CHECK IF EXISTS
    //twoFA
    //login with twoFA
    if (flags['api-token']) {
      const user = await this.getMe(flags);
      if (!user) {
        throw new Error(
          'api token is not creditable, please get your api token from https://console.liara.ir/API.',
        );
      }
      const name = flags.account || (await this.promptName(user.email));
      this.addNewAccountToConfig(currentAccounts, {
        name,
        ...user,
        api_token: flags['api-token'],
      });
      flags['from-login'] && (await AccountUse.run(['--account', name]));
      return;
    }
    const email = flags.email || (await this.promptEmail());
    const userStatus = await this.checkIfExists({ email }, debug);
    const password = flags.password || (await this.promptPassword());
    const totp = userStatus.twoFAEnabled ? await this.promptTwoFA() : undefined;

    if (flags['from-login']) {
      flags.account = `${email.split('@')[0]}`;
    }

    const name = flags.account || (await this.promptName(email));

    const twoFAState = userStatus.twoFAEnabled
      ? { twoFAType: 'totp', totp }
      : undefined;
    const account = await this.login({ email, password, ...twoFAState }, debug);
    this.addNewAccountToConfig(currentAccounts, {
      name,
      ...account,
      current: false,
    });

    flags['from-login'] && (await AccountUse.run(['--account', name]));
    const { accountName } = await this.getCurrentAccount();
    this.log(`> Auth credentials saved in ${chalk.bold(GLOBAL_CONF_PATH)}`);
    accountName && this.log(`> Current account is: ${accountName}`);
  }
  async checkIfExists(body: { email: string }, debug: DebugLogger) {
    try {
      const data = await retry(
        async () => {
          try {
            const data = await this.got
              .post('v1/login/check-if-exists', {
                json: body,
                headers: { Authorization: undefined },
              })
              .json<{
                status: string;
                exists: boolean;
                socialCompleted: boolean;
                twoFAEnabled: boolean;
              }>();
            return data;
          } catch (error) {
            debug('retrying...');
            throw error;
          }
        },
        { retries: 3 },
      );
      if (!data.socialCompleted) {
        throw new Error(`This email has not yet set a password for the account.
Before proceeding, please set a password using the following link: https://console.liara.ir/settings/security
After setting your password, please run 'liara login' or 'liara account:add' again.`);
      }
      if (!exists) {
        throw new Error(
          `This email has not been registered before.
Before proceeding, please sign up using the following link: https://console.liara.ir`,
        );
      }
      return data;
    } catch (error) {
      debug(error);
      this
        .error(`Checking email address failed. Please check your internet connection and try again.
If the issue persists, please submit a ticket at https://console.liara.ir/tickets for further assistance.`);
    }
  }

  async login(
    body: {
      email: string;
      password: string;
      twoFAType?: string;
      totp?: string;
      recoveryCode?: string;
    },
    debug: DebugLogger,
  ) {
    const data = (await retry(
      async () => {
        try {
          const data = await this.got
            .post('v1/login', {
              json: body,
              headers: { Authorization: undefined },
            })
            .json<IAccount>();
          return data;
        } catch (error) {
          debug('retrying...');
          throw error;
        }
      },
      { retries: 3 },
    )) as {
      api_token: string;
      avatar: string;
      fullname: string;
      email: string;
    };
    return data;
  }

  addNewAccountToConfig(
    currentAccounts: IAccounts,
    newAccount: {
      name: string;
      email: string;
      api_token: string;
      fullname: string;
      current: boolean;
      avatar: string;
    },
  ) {
    const accounts = {
      ...currentAccounts,
      [newAccount.name]: {
        email: newAccount.email,
        api_token: newAccount.api_token,
        fullname: newAccount.fullname,
        avatar: newAccount.avatar,
        current: false,
      },
    };

    fs.writeFileSync(
      GLOBAL_CONF_PATH,
      JSON.stringify({ accounts, version: GLOBAL_CONF_VERSION }),
    );
  }

  async promptName(email: string): Promise<string> {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter an optional name for this account:',
      default: `${email.split('@')[0]}`,
    })) as { name: string };
    const liara_json = await this.readGlobalConfig();
    const currentAccounts = liara_json.accounts;
    const currentAccountsName = currentAccounts && Object.keys(currentAccounts);
    return currentAccountsName?.includes(name)
      ? this.error(
          'This name has already been used for another account. Please use a different name.',
        )
      : name;
  }

  async promptEmail(): Promise<string> {
    try {
      return await promptEmail({
        start: `${chalk.green('?')} ${chalk.bold('Enter your email:')} `,
      });
    } catch (error) {
      this.log(); // \n

      if (error.message === 'User abort') {
        process.stdout.write(eraseLines(2));
        console.log(`${chalk.red('> Aborted!')} No changes made.`);
        process.exit(0);
      }

      if (error.message === 'stdin lacks setRawMode support') {
        this.error(
          `Interactive mode not supported – please run ${chalk.green(
            'liara login --email you@domain.com --password your_password',
          )}`,
        );
      }

      throw error;
    }
  }

  async promptPassword(): Promise<string> {
    const { password } = (await inquirer.prompt({
      name: 'password',
      type: 'password',
      message: 'Enter your password:',
      validate(input) {
        if (input.length === 0) {
          return false;
        }

        return true;
      },
    })) as { password: string };

    return password;
  }

  async getMe(flags: any): Promise<IAccount> {
    const { user } = await this.got('v1/me', {
      headers: { Authorization: `Bearer ${flags['api-token']}` },
    }).json<{ user: IAccount }>();

    return user;
  }

  async checkPasswordSet(email: string): Promise<string> {
    try {
      const { exists, socialCompleted, twoFAEnabled } = await this.got
        .post('v1/login/check-if-exists', { json: { email } })
        .json<{
          exists: boolean;
          socialCompleted: boolean;
          twoFAEnabled: boolean;
        }>();

      return email;
    } catch {
      this
        .error(`Checking email address failed. Please check your internet connection and try again.
If the issue persists, please submit a ticket at https://console.liara.ir/tickets for further assistance.`);
    }
  }
  async promptTwoFA() {
    const { totp } = (await inquirer.prompt({
      name: 'Two-Factor Authentication Code',
      type: 'password',
      message: 'Enter your Two-Factor Authentication Code:',
      validate(input) {
        if (input.length === 0) {
          return false;
        }

        return true;
      },
    })) as { totp: string };

    return totp;
  }
}
