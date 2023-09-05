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
  name: 'string';
  status: 'string';
  nameServers: ['string'];
  currentNameServers: ['string'];
  lastCheckAt: 'string';
  createdAt: 'string';
}

export interface ZonesI {
  data: ZoneI[];
}

export default class Hello extends Command {
  static description = 'create a new zone.';

  static baseURL = 'https://dns-service.iran.liara.ir';

  static PATH = 'api/v1/zones';

  static aliases = ['zone:ls'];

  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
  };

  async run() {
    const { flags } = await this.parse(Hello);

    await this.setGotConfig(flags);

    try {
      const { data } = await this.got(Hello.PATH).json<ZonesI>();
      const zonesData = data.map((zone) => {
        const createdAtshamsiData = shamsi.gregorianToJalali(
          new Date(zone.createdAt)
        );
        const lastCheckAtshamsiData = shamsi.gregorianToJalali(
          new Date(zone.lastCheckAt)
        );

        return {
          Name: zone.name,
          status: zone.status,
          lastCheckAt: `${lastCheckAtshamsiData[0]}-${lastCheckAtshamsiData[1]}-${lastCheckAtshamsiData[2]}`,
          createdAt: `${createdAtshamsiData[0]}-${createdAtshamsiData[1]}-${createdAtshamsiData[2]}`,
          currentNameServers: zone.currentNameServers.join(',\n'),
          nameServers: zone.nameServers.join(',\n'),
        };
      });

      ux.table(
        zonesData,
        {
          Name: {},
          status: {},
          lastCheckAt: {},
          createdAt: {},
          currentNameServers: {},
          nameServers: {},
        },
        flags
      );
    } catch (error) {
      this.error(error.message);
    }
  }

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    const new_got = this.got.extend({ prefixUrl: Hello.baseURL });
    this.got = new_got; // baseURL is different for zone api
  }
}
