import ora from 'ora';
import inquirer from 'inquirer';
import Command from '../../base.js';
import { Flags } from '@oclif/core';
import { createDebugLogger } from '../../utils/output.js';
import IGetDatabasesResponse from '../../types/get-dbs-response.js';

export default class Stop extends Command {
  static description = 'stop a database';

  static PATH = 'v1/databases/{database-id}/actions/scale';

  static flags = {
    ...Command.flags,
    name: Flags.string({
      char: 'n',
      description: 'name of your database',
    }),
  };

  async run(): Promise<void> {
    this.spinner = ora();

    const { flags } = await this.parse(Stop);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const hostname = flags.name || (await this.promptHostname());

    try {
      const database = await this.getDatabaseByHostname(hostname);
      if (database === undefined) {
        this.log(`Database ${hostname} not found`);
        return;
      }
      const databaseID = database._id;
      await this.got.post(Stop.PATH.replace('{database-id}', databaseID), {
        json: { scale: 0 },
      });
      this.log(`Database ${hostname} stopped.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }
      this.error(`Could not stop the database. Please try again.`);
    }
  }

  async promptHostname() {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter name:',
      validate: (input) => input.length > 2,
    })) as { name: string };

    return name;
  }

  async getDatabaseByHostname(hostname: string) {
    const { databases } =
      await this.got('v1/databases').json<IGetDatabasesResponse>();

    if (!databases.length) {
      this.error(`Not found any database.
Please open up https://console.liara.ir/databases and create the database, first.`);
    }

    const database = databases.find(
      (database) => database.hostname === hostname,
    );
    return database;
  }
}
