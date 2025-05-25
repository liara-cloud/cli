import got from 'got';
import chalk from 'chalk';
import fs from 'fs-extra';
import retry from 'async-retry';
import inquirer from 'inquirer';
import { Flags } from '@oclif/core';
import promptEmail from 'email-prompt-ts';
import { validate as validateEmail } from 'email-validator';

import AccountUse from './use.js';
import hooks from '../../interceptors.js';
import Command, { IAccount } from '../../base.js';
import eraseLines from '../../utils/erase-lines.js';
import { createDebugLogger } from '../../utils/output.js';

import {
  FALLBACK_REGION,
  REGIONS_API_URL,
  GLOBAL_CONF_PATH,
  GLOBAL_CONF_VERSION,
} from '../../constants.js';

interface ILoginResponse {
  api_token: string;
  avatar: string;
  fullname: string;
  email: string;
}

interface IAccountConfig {
  accounts: Record<string, IAccount>;
  version: string;
}

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

  private debug = createDebugLogger(this.flags.debug);
  private gotInstance = got.extend({
    prefixUrl: REGIONS_API_URL[this.flags.region || FALLBACK_REGION],
    hooks,
  });

  async run(): Promise<void> {
    const { flags } = await this.parse(AccountAdd);
    const config = await this.loadConfig();
    
    const region = flags.region || FALLBACK_REGION;
    this.initializeGotInstance(region);

    const { api_token, fullname, avatar, email } = await this.processUserData(flags, region);
    const validatedEmail = await this.validateAndGetEmail(flags.email || email);
    const password = await this.getPassword(flags);

    const accountData = await this.authenticateUser({
      email: validatedEmail,
      password,
      apiToken: flags['api-token'],
    });

    const accountName = await this.getAccountName(flags, validatedEmail, region, config.accounts);
    await this.saveAccount(config, accountName, {
      email: validatedEmail,
      api_token: api_token || accountData.api_token,
      region,
      fullname: fullname || accountData.fullname,
      avatar: avatar || accountData.avatar,
      current: false,
    });

    await this.handlePostAddActions(flags, accountName);
    this.displaySuccessMessage(accountName);
  }

  private initializeGotInstance(region: string): void {
    this.gotInstance = got.extend({
      prefixUrl: REGIONS_API_URL[region],
      hooks,
    });
  }

  private async loadConfig(): Promise<IAccountConfig> {
    const config = await this.readGlobalConfig();
    return {
      accounts: config.accounts || {},
      version: GLOBAL_CONF_VERSION,
    };
  }

  private async processUserData(flags: any, region: string) {
    let api_token, fullname, avatar, email;

    if (flags['api-token']) {
      const user = await this.getMe(flags);
      email = user.email;
      api_token = flags['api-token'];
      fullname = user.fullname;
      avatar = user.avatar;
    }

    return { api_token, fullname, avatar, email };
  }

  private async validateAndGetEmail(email?: string): Promise<string> {
    if (email) return this.checkPasswordSet(email);

    let validatedEmail: string;
    do {
      validatedEmail = await this.promptEmail();
      if (!validateEmail(validatedEmail)) {
        process.stdout.write(eraseLines(1));
      }
    } while (!validateEmail(validatedEmail));

    this.log();
    return this.checkPasswordSet(validatedEmail);
  }

  private async getPassword(flags: any): Promise<string | undefined> {
    if (flags.password || flags['api-token']) {
      return flags.password;
    }
    return this.promptPassword();
  }

  private async authenticateUser(credentials: {
    email: string;
    password?: string;
    apiToken?: string;
  }): Promise<ILoginResponse> {
    if (credentials.apiToken) {
      return {} as ILoginResponse; // Return empty object if using API token
    }

    return retry(
      async () => {
        try {
          return await this.gotInstance.post('v1/login', {
            json: {
              email: credentials.email,
              password: credentials.password,
            },
            headers: { Authorization: undefined },
          }).json<ILoginResponse>();
        } catch (error) {
          this.debug('Authentication retry...', error);
          throw error;
        }
      },
      { retries: 3 }
    );
  }

  private async getAccountName(
    flags: any,
    email: string,
    region: string,
    currentAccounts: Record<string, IAccount>
  ): Promise<string> {
    if (flags['from-login']) {
      return `${email.split('@')[0]}_${region}`;
    }

    if (flags.account) {
      if (Object.keys(currentAccounts).includes(flags.account)) {
        this.error('Account name already exists. Please choose a different name.');
      }
      return flags.account;
    }

    return this.promptName(email, region, currentAccounts);
  }

  private async promptName(
    email: string,
    region: string,
    currentAccounts: Record<string, IAccount>
  ): Promise<string> {
    const { name } = await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter an optional name for this account:',
      default: `${email.split('@')[0]}_${region}`,
    });

    if (Object.keys(currentAccounts).includes(name)) {
      this.error(
        'This name has already been used for another account. Please use a different name.'
      );
    }

    return name;
  }

  private async promptEmail(): Promise<string> {
    try {
      return await promptEmail({
        start: `${chalk.green('?')} ${chalk.bold('Enter your email:')} `,
      });
    } catch (error) {
      this.handleEmailPromptError(error);
    }
  }

  private handleEmailPromptError(error: Error): never {
    this.log(); // Add newline

    if (error.message === 'User abort') {
      process.stdout.write(eraseLines(2));
      this.log(`${chalk.red('> Aborted!')} No changes made.`);
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

  private async promptPassword(): Promise<string> {
    const { password } = await inquirer.prompt({
      name: 'password',
      type: 'password',
      message: 'Enter your password:',
      validate: (input) => !!input.length || 'Password cannot be empty',
    });

    return password;
  }

  private async getMe(flags: any): Promise<IAccount> {
    const { user } = await this.gotInstance('v1/me', {
      headers: { Authorization: `Bearer ${flags['api-token']}` },
    }).json<{ user: IAccount }>();

    return user;
  }

  private async checkPasswordSet(email: string): Promise<string> {
    try {
      const { exists, socialCompleted } = await this.gotInstance
        .post('v1/login/check-if-exists', { json: { email } })
        .json<{ exists: boolean; socialCompleted: boolean }>();

      if (!exists) {
        this.error(
          `This email has not been registered before.
Before proceeding, please sign up using the following link: https://console.liara.ir`
        );
      }

      if (!socialCompleted) {
        this.error(
          `This email has not yet set a password for the account.
Before proceeding, please set a password using the following link: https://console.liara.ir/settings/security
After setting your password, please run 'liara login' or 'liara account:add' again.`
        );
      }

      return email;
    } catch (error) {
      this.error(
        `Checking email address failed. Please check your internet connection and try again.
If the issue persists, please submit a ticket at https://console.liara.ir/tickets for further assistance.`
      );
    }
  }

  private async saveAccount(
    config: IAccountConfig,
    accountName: string,
    accountData: IAccount
  ): Promise<void> {
    const updatedConfig = {
      ...config,
      accounts: {
        ...config.accounts,
        [accountName]: accountData,
      },
    };

    fs.writeFileSync(
      GLOBAL_CONF_PATH,
      JSON.stringify(updatedConfig)
    );
  }

  private async handlePostAddActions(flags: any, accountName: string): Promise<void> {
    if (flags['from-login']) {
      await AccountUse.run(['--account', accountName]);
    }
  }

  private async displaySuccessMessage(accountName?: string): Promise<void> {
    const { accountName: currentAccount } = await this.getCurrentAccount();
    
    this.log(`> Auth credentials saved in ${chalk.bold(GLOBAL_CONF_PATH)}`);
    if (currentAccount) {
      this.log(`> Current account is: ${currentAccount}`);
    }
  }
}
