import inquirer from 'inquirer';
import ora from 'ora';
import { Flags } from '@oclif/core';
import Command, { IConfig, IGetMailboxesResponse } from '../../base.js';
import { createDebugLogger } from '../../utils/output.js';
import { REGIONS_API_URL, DEV_MODE } from '../../constants.js';

export default class MailDelete extends Command {
  static description = 'delete an mail';

  static flags = {
    ...Command.flags,
    mail: Flags.string({
      char: 'a',
      description: 'mail id',
    }),
  };

  static aliases = ['mail:delete'];

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: DEV_MODE ? 'http://localhost:3000' : REGIONS_API_URL['mail'],
    });
  }

  async run() {
    const { flags } = await this.parse(MailDelete);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);

    const { data } = await this.got(
      'api/v1/mails'
    ).json<IGetMailboxesResponse>();

    const mailDomain = await this.promptMails();
    const mailId =
      flags.mail ||
      data.mailServers.find((mail) => mail.domain === mailDomain)?.id;

    try {
      // TODO: Add --force or -f flag to force the deletion
      if (await this.confirm(mailDomain)) {
        await this.got.delete(`api/v1/mails/${mailId}`);
        this.log(`Mail ${mailDomain} deleted.`);
      }
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }

      if (error.response && error.response.status === 404) {
        this.error(`Could not find the mail.`);
      }

      if (error.response && error.response.status === 409) {
        this.error(`Another operation is already running. Please wait.`);
      }

      this.error(`Could not delete the mail. Please try again.`);
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

  async confirm(mail: string) {
    const { confirmation } = (await inquirer.prompt({
      name: 'confirmation',
      type: 'confirm',
      message: `Are you sure you want to delete "${mail}"?`,
      default: false,
    })) as { confirmation: boolean };

    return confirmation;
  }
}
