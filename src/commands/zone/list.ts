import chalk from 'chalk';
import Command, { IConfig } from '../../base.js';
import { createDebugLogger } from '../../utils/output.js';
import { ux } from '@oclif/core';
import * as shamsi from 'shamsi-date-converter';
import moment from 'moment';

export interface IZone {
  name: string;
  status: string;
  nameServers: [string];
  currentNameServers: [string];
  lastCheckAt: string;
  createdAt: string;
}

export interface IZones {
  data: IZone[];
}

export default class List extends Command {
  static description = 'list all zones.';

  static baseURL = 'https://dns-service.iran.liara.ir';

  static PATH = 'api/v1/zones';

  static aliases = ['zone:ls'];

  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
  };

  async run() {
    const { flags } = await this.parse(List);

    await this.setGotConfig(flags);

    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    try {
      const { data } = await this.got(List.PATH).json<IZones>();
      const zonesData = data.map((zone) => {
        const createdAtshamsiData = shamsi.gregorianToJalali(
          new Date(zone.createdAt)
        );

        const lastCheckAt = new Date(zone.lastCheckAt);

        const lastCheckDuration = moment
          .duration(moment(lastCheckAt).diff(moment(Date.now())))
          .humanize(true);

        return {
          Name: zone.name,
          status:
            zone.status === 'ACTIVE'
              ? chalk.green('ACTIVE')
              : chalk.gray('PENDING'),
          'created At': `${createdAtshamsiData[0]}-${createdAtshamsiData[1]}-${createdAtshamsiData[2]}`,
          'lastCheck At': lastCheckDuration,
          'current Name Servers': zone.currentNameServers.join(', '),
          'name Servers': zone.nameServers.join(', '),
        };
      });

      ux.table(
        zonesData,
        {
          Name: {},
          status: {},
          'created At': {},
          'lastCheck At': {},
          'current Name Servers': {},
          'name Servers': {},
        },
        flags
      );
    } catch (error) {
      this.error(error.message);
    }
  }

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    const new_got = this.got.extend({ prefixUrl: List.baseURL });
    this.got = new_got; // baseURL is different for zone api
  }
}
