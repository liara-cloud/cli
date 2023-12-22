import { ux } from '@oclif/core';
import shamsi from 'shamsi-date-converter';

import Command from '../../base.js';
import IGetNetworkResponse from '../../types/get-network-response.js';

export default class NetworkList extends Command {
  static description = 'list available networks';

  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
  };

  static aliases = ['network:ls'];

  async run() {
    const { flags } = await this.parse(NetworkList);

    await this.setGotConfig(flags);

    const { networks } = await this.got(
      'v1/networks'
    ).json<IGetNetworkResponse>();

    if (!networks.length) {
      this.error(`No network found. 
Please create a network first by visiting https://console.liara.ir/apps/create or by using the command 'liara network:create'.`);
    }

    const networksData = networks.map((network) => {
      const shamsiData = shamsi.gregorianToJalali(new Date(network.createdAt));
      return {
        Name: network.name,
        'Created At': `${shamsiData[0]}-${shamsiData[1]}-${shamsiData[2]}`,
      };
    });

    ux.table(
      networksData,
      {
        Name: {},
        'Created At': {},
      },
      flags
    );
  }
}
