import got from 'got';
import chalk from 'chalk';
import fs from 'fs-extra';
import AccountUse from './use.js';
import retry from 'async-retry';
import Command from '../../base.js';
import inquirer from 'inquirer';
import { Flags } from '@oclif/core';
import hooks from '../../interceptors.js';
import promptEmail from 'email-prompt-ts';
import eraseLines from '../../utils/erase-lines.js';
import { createDebugLogger } from '../../utils/output.js';
import { validate as validateEmail } from 'email-validator';
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

    const region = flags.region || FALLBACK_REGION;

    if (!flags.email) {
      let emailIsValid = false;
      do {
        flags.email = await this.promptEmail();
        emailIsValid = validateEmail(flags.email);
        if (!emailIsValid) {
          process.stdout.write(eraseLines(1));
        }
      } while (!emailIsValid);

      this.log();
    }

    const body = {
      email: flags.email,
      password:
        flags.password ||
        (!flags['api-token'] && (await this.promptPassword())),
    };
    if (flags['from-login']) {
      flags.account = `${flags.email.split('@')[0]}_${region}`;
    }

    const name = flags.account || (await this.promptName(flags.email, region));

    this.got = got.extend({ prefixUrl: REGIONS_API_URL[region], hooks });
    const { api_token, fullname, avatar } = (await retry(
      async () => {
        try {
          const data = await this.got
            .post('v1/login', {
              json: body,
              headers: { Authorization: undefined },
            })
            .json<{ api_token: string }>();
          return data;
        } catch (error) {
          debug('retrying...');
          throw error;
        }
      },
      { retries: 3 }
    )) as { api_token: string; avatar: string; fullname: string };

    const accounts = {
      ...currentAccounts,
      [name]: {
        email: body.email,
        api_token,
        region,
        fullname,
        avatar,
        current: false,
      },
    };

    fs.writeFileSync(
      GLOBAL_CONF_PATH,
      JSON.stringify({ accounts, version: GLOBAL_CONF_VERSION })
    );
    flags['from-login'] && (await AccountUse.run(['--account', name]));

    const { accountName } = await this.getCurrentAccount();
    this.log(`> Auth credentials saved in ${chalk.bold(GLOBAL_CONF_PATH)}`);
    accountName && this.log(`> Current account is: ${accountName}`);
  }

  async promptName(email: string, region: string): Promise<string> {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter an optional name for this account:',
      default: `${email.split('@')[0]}_${region}`,
    })) as { name: string };
    const liara_json = await this.readGlobalConfig();
    const currentAccounts = liara_json.accounts;
    const currentAccountsName = currentAccounts && Object.keys(currentAccounts);
    return currentAccountsName?.includes(name)
      ? this.error(
          'This name has already been used for another account. Please use a different name.'
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
            'liara login --email you@domain.com --password your_password'
          )}`
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
}
