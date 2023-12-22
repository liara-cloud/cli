import inquirer from 'inquirer';
import { Flags } from '@oclif/core';

import Command from '../../base.js';
import { createDebugLogger } from '../../utils/output.js';

export default class NetworkCreate extends Command {
  static description = 'create network';

  static flags = {
    ...Command.flags,
    name: Flags.string({
      char: 'n',
      description: 'name of your network',
    }),
  };

  async run() {
    const { flags } = await this.parse(NetworkCreate);

    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);

    const networkName = flags.name || (await this.promptNetworkName());

    try {
      await this.got.post('v1/networks', { json: { networkName } });
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }

      if (error.response && error.response.statusCode === 409) {
        this.error(
          `The network already exists. Please use a unique name for your network.`
        );
      }
    }

    this.log(`Network ${networkName} created.`);
  }

  async promptNetworkName() {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter network name:',
      validate: (input) => input.length > 2,
    })) as { name: string };

    return name;
  }
}
