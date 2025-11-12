import inquirer from 'inquirer';
import Command, { IConfig } from '../../base.js';
import { Flags } from '@oclif/core';
import { createDebugLogger } from '../../utils/output.js';
import { ux } from '@oclif/core';
import * as shamsi from 'shamsi-date-converter';
import moment from 'moment';
import chalk from 'chalk';
import { IZoneGet } from '../../types/zone.js';

export default class Get extends Command {
  static description = 'inspect zone details';

  static baseURL = 'https://dns-service.iran.liara.ir';

  static PATH = 'api/v1/zones/{zone}';

  static flags = {
    ...Command.flags,
    zone: Flags.string({
      char: 'z',
      description: 'name of the zone (domain)',
    }),
    ...ux.table.flags(),
  };

  async run() {
    const { flags } = await this.parse(Get);

    await this.setGotConfig(flags);

    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const zone = flags.zone || (await this.promptZone());

    try {
      const { data } = await this.got(
        Get.PATH.replace('{zone}', zone),
      ).json<IZoneGet>();
      const createdAtshamsiData = shamsi.gregorianToJalali(
        new Date(data.createdAt),
      );

      const lastCheckAt = new Date(data.lastCheckAt);
      const lastCheckDuration = moment
        .duration(moment(lastCheckAt).diff(moment(Date.now())))
        .humanize(true);

      const output_data = {
        Name: data.name,
        status:
          data.status === 'ACTIVE'
            ? chalk.green('ACTIVE')
            : chalk.gray('PENDING'),
        'created at': `${createdAtshamsiData[0]}-${createdAtshamsiData[1]}-${createdAtshamsiData[2]}`,
        'lastCheck at': lastCheckDuration,
        'current name servers': data.currentNameServers.join(',\n'),
        'name servers': data.nameServers.join(',\n'),
      };

      ux.table(
        [output_data],
        {
          Name: {},
          status: {},
          'created at': {},
          'lastCheck at': {},
          'current name servers': {},
          'name servers': {},
        },
        flags,
      );
    } catch (error) {
      if (error.response && error.response.statusCode === 404) {
        this.error(`Zone not found.`);
      }
      this.error(error.message);
    }
  }

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    const new_got = this.got.extend({ prefixUrl: Get.baseURL });
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
