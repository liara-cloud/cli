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
import ora from 'ora';

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
    this.spinner = ora();
    const liara_json = await this.readGlobalConfig();
    const currentAccounts = liara_json.accounts;

    this.got = got.extend({ prefixUrl: REGIONS_API_URL['iran'] });
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
    if (!validateEmail(email)) {
      this.log();
      this.spinner.fail(
        `Email validation failed. Please enter a valid email, e.g. info@liara.ir`,
      );
      process.exit(1);
    }

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

    const userInfo = { email, password, ...twoFAState };
    debug2(userInfo);
    const account = await this.login(userInfo);
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

      if (!data.exists) {
        this.log();
        this.spinner.fail(
          `The email you entered isn’t registered.
To continue, please sign up at: https://console.liara.ir`,
        );
        process.exit(1);
      }
      if (!data.socialCompleted) {
        this.log();
        this.spinner.fail(`No password is set for this account.
Set one here: https://console.liara.ir/settings/security
Then run 'liara login' or 'liara account:add' again.`);
        process.exit(1);
      }
      return data;
    } catch (error) {
      debug(error);
      this.error(`Please check your internet connection and try again.
If the issue persists, please submit a ticket at https://console.liara.ir/tickets for further assistance.`);
    }
  }

  async login(body: {
    email: string;
    password: string;
    twoFAType?: string;
    totp?: string;
    recoveryCode?: string;
  }) {
    try {
      const data = await this.got
        .post('v1/login', {
          json: body,
          headers: { Authorization: undefined },
        })
        .json<IAccount>();

      return {
        email: data.email,
        api_token: data.api_token!,
        fullname: data.fullname,
        current: data.current,
        avatar: data.avatar,
      };
    } catch (error) {
      if (error.response.statusCode == 401) {
        this.spinner.fail(`\nAuthentication failed.
The credentials you entered is incorrect.
If you’ve forgotten your password or twoFA, reset it at https://console.liara.ir
        `);
        process.exit(1);
      }
      this.spinner.fail(`\nAuthentication failed.
If the issue persists, please open a ticket at https://console.liara.ir/tickets
Error: ${error.response.statusMessage} (${error.response.statusCode})
        `);
      process.exit(1);
    }
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
    this.log();
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

  async promptTwoFA() {
    const { totp } = (await inquirer.prompt({
      name: 'totp',
      type: 'input',
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

function debug2(log: any) {
  console.log('====================================');
  console.log(log);
  console.log('====================================');
}
