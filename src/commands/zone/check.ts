import inquirer from 'inquirer';
import Command, { IConfig } from '../../base.js';
import { Flags } from '@oclif/core';
import { createDebugLogger } from '../../utils/output.js';
import { ux } from '@oclif/core';

export default class Check extends Command {
  static description = 'Check a zone.';

  static baseURL = 'https://dns-service.iran.liara.ir';

  static PATH = 'api/v1/zones/{zone}/check';

  static aliases = ['zone:ch'];

  static flags = {
    ...Command.flags,
    zone: Flags.string({
      char: 'z',
      description: 'name of the zone (domain)',
    }),
    ...ux.table.flags(),
  };

  async run() {
    const { flags } = await this.parse(Check);

    await this.setGotConfig(flags);

    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const zone = flags.zone || (await this.promptZone());

    try {
      const { data } = await this.got
        .put(Check.PATH.replace('{zone}', zone))
        .json<{ status: string; data: string }>();
      this.log(data);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }

      if (error.response && error.response.statusCode === 400) {
        this.error(`Enter correct domain name.`);
      }

      if (error.response && error.response.statusCode === 404) {
        this.error(`The zone does not exist.`);
      }

      if (error.response && error.response.statusCode === 406) {
        this.error(`System is checking your domain... Please try again later.`);
      }

      this.error(`Could not check the zone. Please try again.`);
    }
  }

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    const new_got = this.got.extend({ prefixUrl: Check.baseURL });
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
}
