import ora from 'ora';
import inquirer from 'inquirer';
import Command, { IConfig } from '../../base.js';
import { Flags } from '@oclif/core';
import { createDebugLogger } from '../../utils/output.js';
import spacing from '../../utils/spacing.js';
import { ux } from '@oclif/core';
import { string } from '@oclif/core/lib/flags.js';
import { relativeTimeThreshold } from 'moment';
import got, { Options } from 'got';
import * as shamsi from 'shamsi-date-converter';

export interface ZoneI {
  status: string;
  data: {
    name: 'string';
    status: 'string';
    nameServers: ['string'];
    currentNameServers: ['string'];
    lastCheckAt: 'string';
    createdAt: 'string';
  };
}

export interface ZonesI {
  data: ZoneI[];
}

export default class Hello extends Command {
  static description = 'delete a zone.';

  static baseURL = 'https://dns-service.iran.liara.ir';

  static PATH = 'api/v1/zones/{zone}';

  static aliases = ['zone:del', 'zone:rm'];

  static flags = {
    ...Command.flags,
    zone: Flags.string({
      char: 'z',
      description: 'name of the zone (domain)',
    }),
    yes: Flags.boolean({
      char: 'y',
      description: 'say yes to continue prompt',
    }),
    ...ux.table.flags(),
  };

  async run() {
    const { flags } = await this.parse(Hello);

    await this.setGotConfig(flags);

    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const zone = flags.zone || (await this.promptZone());
    const sayYes = flags.yes;

    try {
      if (!sayYes && (await this.promptContinue()) === 'n') {
        this.log('Operation cancelled');
        return;
      }
      await this.got.delete(Hello.PATH.replace('{zone}', zone));
      this.log('zone deleted');
    } catch (error) {
      if (error.response && error.response.statusCode === 404) {
        this.error(`Zone not found.`);
      }
      this.error(error.message);
    }
  }

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    const new_got = this.got.extend({ prefixUrl: Hello.baseURL });
    this.got = new_got; // baseURL is different for zone api
  }

  async promptZone() {
    const { zone } = (await inquirer.prompt({
      name: 'zone',
      type: 'input',
      message: 'Enter domain:',
      validate: (input) => input.length > 2,
    })) as { zone: string };

    return zone;
  }

  async promptContinue() {
    const { yes } = (await inquirer.prompt({
      name: 'yes',
      type: 'input',
      message: 'continue? (y/n):',
      validate: (input) => input === 'y' || input === 'n',
    })) as { yes: string };

    return yes;
  }
}
