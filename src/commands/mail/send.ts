import inquirer from 'inquirer';
import ora, { Ora } from 'ora';
import { Flags } from '@oclif/core';
import Command, { IConfig, IGetMailboxesResponse } from '../../base.js';
import { createDebugLogger } from '../../utils/output.js';
import { REGIONS_API_URL, DEV_MODE } from '../../constants.js';

export default class SendMail extends Command {
  static description = 'send an mail';

  static flags = {
    ...Command.flags,
    from: Flags.string({
      description: 'from',
    }),
    to: Flags.string({
      description: 'to',
    }),
    subject: Flags.string({
      description: 'subject',
    }),
    text: Flags.string({
      description: 'text',
    }),
    mail: Flags.string({
      description: 'mail name',
    }),
  };

  static aliases = ['mail:send'];

  spinner!: Ora;

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: DEV_MODE ? 'http://localhost:3000' : REGIONS_API_URL['mail'],
    });
  }

  async run() {
    this.spinner = ora();
    const { flags } = await this.parse(SendMail);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);

    const { data } = await this.got(
      'api/v1/mails'
    ).json<IGetMailboxesResponse>();

    const mailDomain = await this.promptMails();
    const mailId =
      flags.mail ||
      data.mailServers.find((mail) => mail.domain === mailDomain)?.id;

    const from = flags.from || (await this.promptFrom());

    const to = flags.to || (await this.promptTo());

    const subject = flags.subject || (await this.promptSubject());

    const text = flags.text || (await this.promptText());

    try {
      await this.got.post(`api/v1/mails/${mailId}/messages`, {
        json: { from, to, subject, text },
      });
      this.log(`Mail has been sent to ${to}`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }

      if (error.response && error.response.statusCode === 404) {
        this.error(`Could not send the mail.`);
      }

      if (error.response && error.response.statusCode === 401) {
        this.error(`Missing authentication.`);
      }

      if (
        error.response &&
        error.response.statusCode === 404 &&
        error.response.body.message === 'Account not found.'
      ) {
        this.error(`Account not found.`);
      }

      if (
        error.response &&
        error.response.statusCode === 404 &&
        error.response.body.message === 'Mail Server not found.'
      ) {
        this.error(`Mail Server not found.`);
      }

      this.error(`Could not send the mail. Please try again.`);
    }
  }

  async promptMails() {
    this.spinner = ora();
    this.spinner.start('Loading...');
    try {
      const { data } = await this.got(
        'api/v1/mails'
      ).json<IGetMailboxesResponse>();

      this.spinner.stop();

      if (!data.mailServers.length) {
        this.warn(
          'Please go to https://console.liara.ir/mail and create an mailbox, first.'
        );
        this.exit(1);
      }

      const { mailDomain } = (await inquirer.prompt({
        name: 'mailDomain',
        type: 'list',
        message: 'Please select a mail:',
        choices: [...data.mailServers.map((mail) => mail.domain)],
      })) as { mailDomain: string };

      return mailDomain;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptFrom(): Promise<string> {
    const { from } = (await inquirer.prompt({
      name: 'from',
      type: 'input',
      message: 'What address should it be sent from:',
      validate: (input) => input.length > 2,
    })) as { from: string };

    return from;
  }

  async promptTo(): Promise<string> {
    const { to } = (await inquirer.prompt({
      name: 'to',
      type: 'input',
      message: 'To which email address should it be sent:',
      validate: (input) => input.length > 2,
    })) as { to: string };

    return to;
  }

  async promptSubject(): Promise<string> {
    const { subject } = (await inquirer.prompt({
      name: 'subject',
      type: 'input',
      message: 'The subject of your mail:',
      validate: (input) => input.length > 2,
    })) as { subject: string };

    return subject;
  }

  async promptText(): Promise<string> {
    const { text } = (await inquirer.prompt({
      name: 'text',
      type: 'input',
      message: 'The text of your mail:',
      validate: (input) => input.length > 2,
    })) as { text: string };

    return text;
  }
}
