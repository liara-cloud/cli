import ora, { Ora } from 'ora';
import inquirer from 'inquirer';
import Command, { IConfig } from '../../base.js';
import { Flags } from '@oclif/core';
import {
  MAIL_SERVICE_MODES,
  MAIL_SERVICE_PLANS,
  MAIL_SERVICE_URL,
  DEV_MODE,
  MAIL_SERVICE_URL_DEV,
} from '../../constants.js';
import { createDebugLogger } from '../../utils/output.js';

export default class MailCreate extends Command {
  static description = 'create a MailServer';

  static flags = {
    ...Command.flags,
    domain: Flags.string({
      description: 'domain',
    }),
    plan: Flags.string({
      description: 'plan',
    }),
    mode: Flags.string({
      description: 'mode',
    }),
  };

  static aliases = ['mail:create'];

  spinner!: Ora;

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: DEV_MODE ? MAIL_SERVICE_URL_DEV : MAIL_SERVICE_URL,
    });
  }

  async run() {
    this.spinner = ora();
    const { flags } = await this.parse(MailCreate);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);

    const domain = flags.domain || (await this.promptDomain());

    const account = await this.getCurrentAccount();

    await this.setGotConfig(flags);

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const plan = flags.platform || (await this.promptPlan());

    if (!MAIL_SERVICE_PLANS.includes(plan)) {
      this.error(`Unknown plan: ${plan}`);
    }

    const mode = flags.plan || (await this.promptMode());

    if (!MAIL_SERVICE_MODES.includes(mode)) {
      this.error(`Unknown mode: ${mode}`);
    }

    try {
      await this.got.post('api/v1/mails', { json: { domain, plan, mode } });
      this.log(`MailServer ${domain} created.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }

      if (error.response && error.response.statusCode === 404) {
        this.error(`Could not create the MailServer.`);
      }

      if (error.response && error.response.statusCode === 409) {
        this.error(
          `The MailServer already exists. Please use a unique name for your MailServer.`
        );
      }

      if (
        error.response &&
        error.response.statusCode === 403 &&
        error.response.body
      ) {
        this.error(
          `You are allowed to create only one Mail Server on the free plan.`
        );
      }

      this.error(`Could not create the MailServer. Please try again.`);
    }
  }

  async promptDomain(): Promise<string> {
    const { domain } = (await inquirer.prompt({
      name: 'domain',
      type: 'input',
      message: 'Enter your domain:',
      validate: (input) => input.length > 2,
    })) as { domain: string };

    return domain;
  }

  async promptPlan() {
    this.spinner.start('Loading...');

    try {
      this.spinner.stop();

      const { plan } = (await inquirer.prompt({
        name: 'plan',
        type: 'list',
        message: 'Please select the plan you want:',
        choices: [...MAIL_SERVICE_PLANS.map((plan) => plan)],
      })) as { plan: string };

      return plan;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptMode() {
    this.spinner.start('Loading...');

    try {
      this.spinner.stop();

      const { mode } = (await inquirer.prompt({
        name: 'mode',
        type: 'list',
        message: 'Please select the mode you want:',
        choices: [...MAIL_SERVICE_MODES.map((mode) => mode)],
      })) as { mode: string };

      return mode;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }
}
