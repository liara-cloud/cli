import ora from 'ora';
import inquirer from 'inquirer';
import Command from '../../../base.js';
import { Args, Flags, ux } from '@oclif/core';
import { createDebugLogger } from '../../../utils/output.js';
import IGetDatabasesResponse from '../../../types/get-dbs-response.js';
import * as shamsi from 'shamsi-date-converter';

export interface IBackUp {
  name: string;
  lastModified: string;
  etag: string;
  size: number;
}

export interface IBackups {
  backups: IBackUp[];
}

export default class BackUp extends Command {
  static description = 'create a database backup';

  static PATH = 'v1/databases/{database-id}/backups';

  static flags = {
    ...Command.flags,
    name: Flags.string({
      char: 'n',
      description: 'name of your database',
    }),
  };

  async run(): Promise<void> {
    this.spinner = ora();

    const { flags, args } = await this.parse(BackUp);
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
      await this.got.post(BackUp.PATH.replace('{database-id}', databaseID));
      this.log(`Backup task for database ${hostname} created.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }
      this.error(`Could not create backup task. Please try again.`);
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
    const { databases } = await this.got(
      'v1/databases'
    ).json<IGetDatabasesResponse>();

    if (!databases.length) {
      this.error(`Not found any database.
Please open up https://console.liara.ir/databases and create the database, first.`);
    }

    const database = databases.find(
      (database) => database.hostname === hostname
    );
    return database;
  }

  async promptBackupName() {
    const { backup } = (await inquirer.prompt({
      name: 'backup',
      type: 'input',
      message: 'Enter backup name:',
      validate: (input) => input.length > 2,
    })) as { backup: string };

    return backup;
  }
}
