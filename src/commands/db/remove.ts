import ora from 'ora';
import inquirer from 'inquirer';
import Command from '../../base.js';
import { Flags } from '@oclif/core';
import { createDebugLogger } from '../../utils/output.js';
import IGetDatabasesResponse from '../../types/get-dbs-response.js';
import { ux } from '@oclif/core';

export default class Remove extends Command {
  static description = 'remove a database';

  static PATH = 'v1/databases/{database-id}';

  static aliases = ['db:rm'];

  static flags = {
    ...Command.flags,
    name: Flags.string({
      char: 'n',
      description: 'name of your database',
    }),
    yes: Flags.boolean({
      char: 'y',
      description: 'say yes to continue prompt',
    }),
  };

  async run(): Promise<void> {
    this.spinner = ora();

    const { flags } = await this.parse(Remove);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const hostname = flags.name || (await this.promptHostname());
    const sayYes = flags.yes;

    try {
      const database = await this.getDatabaseByHostname(hostname);
      if (database === undefined) {
        this.log(`Database ${hostname} not found`);
        return;
      }
      const tableData = [
        {
          type: database.type,
          hostname: database.hostname,
          status: database.status.toString(),
        },
      ];
      const tableConfig = {
        Hostname: { get: (row: any) => row.hostname },
        Type: { get: (row: any) => row.type },
        status: { get: (row: any) => row.status },
      };
      ux.table(tableData, tableConfig, {
        title: 'Database Specification',
      });
      if (!sayYes && (await this.promptContinue()) === 'n') {
        this.log('Operation cancelled');
        return;
      }
      const databaseID = database._id;
      await this.got.delete(Remove.PATH.replace('{database-id}', databaseID));
      this.log(`Database ${hostname} removed.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }
      this.error(`Could not remove the database. Please try again.`);
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

  async promptContinue() {
    const { yes } = (await inquirer.prompt({
      name: 'yes',
      type: 'input',
      message: 'continue? (y/n):',
      validate: (input) => input === 'y' || input === 'n',
    })) as { yes: string };

    return yes;
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
