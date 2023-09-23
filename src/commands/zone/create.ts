import ora from 'ora';
import inquirer from 'inquirer';
import Command, { IConfig } from '../../base.js';
import { Flags } from '@oclif/core';
import { createDebugLogger } from '../../utils/output.js';

export default class Create extends Command {
  static description = 'create a new zone';

  static baseURL = 'https://dns-service.iran.liara.ir';

  static PATH = 'api/v1/zones';

  static flags = {
    ...Command.flags,
    zone: Flags.string({
      char: 'z',
      description: 'zone name (domain)',
    }),
  };

  async run(): Promise<void> {
    this.spinner = ora();

    const { flags } = await this.parse(Create);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const name = flags.zone || (await this.promptName());

    try {
      await this.got.post(Create.PATH, {
        json: { name: name },
      });
      this.log(`Zone ${name} created.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }

      if (error.response && error.response.statusCode === 400) {
        this.error(`Enter correct domain name.`);
      }

      if (error.response && error.response.statusCode === 409) {
        this.error(`The zone already exists.`);
      }

      this.error(`Could not create the zone. Please try again.`);
    }
  }

  async promptName() {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter domain:',
      validate: (input) => input.length > 2,
    })) as { name: string };

    return name;
  }

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    const new_got = this.got.extend({ prefixUrl: Create.baseURL });
    this.got = new_got; // baseURL is different for zone api
  }
}
