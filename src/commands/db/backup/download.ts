import ora from 'ora';
import inquirer from 'inquirer';
import Command from '../../../base.js';
import { Flags } from '@oclif/core';
import { createDebugLogger } from '../../../utils/output.js';
import IGetDatabasesResponse from '../../../types/get-dbs-response.js';
import { createWriteStream } from 'node:fs';
import got from 'got';

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
  static description = 'download a database backup';

  static PATH = 'v1/databases/{database-id}/backups';

  static aliases = ['db:backup:dl'];

  static flags = {
    ...Command.flags,
    name: Flags.string({
      char: 'n',
      description: 'name of your database',
    }),
    backup: Flags.string({
      char: 'b',
      description: 'select which backup to download',
    }),
    output: Flags.string({
      char: 'o',
      description:
        'download the backup file and save it as the given name in the current working directory',
    }),
  };

  async run(): Promise<void> {
    this.spinner = ora();

    const { flags } = await this.parse(BackUp);
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
      const backupName = flags.backup || (await this.promptBackupName());
      const downloadLink = await this.got
        .post(
          BackUp.PATH.replace('{database-id}', databaseID) +
            `/${backupName}/download`
        )
        .json<any>();

      this.log(`download link: ${downloadLink.link}`);

      const _ = backupName.split('/');
      const outputDefault = _[_.length - 1];
      const output =
        flags.output || (await this.promptOutput('./' + outputDefault));
      if (output.length > 0) {
        // Our got is costumized. So we use the main got.
        await got.stream(downloadLink.link).pipe(createWriteStream(output));
      }
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }
      this.error(`Could not get backup. Please try again.`);
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

  async promptOutput(defaultName: string) {
    const { yes } = (await inquirer.prompt({
      name: 'yes',
      type: 'input',
      message: 'download backup file? (y/n):',
      validate: (input) => input === 'y' || input === 'n',
    })) as { yes: string };

    if (yes === 'y') {
      const { output } = (await inquirer.prompt({
        name: 'output',
        type: 'input',
        default: defaultName,
        message: 'Enter output name:',
      })) as { output: string };
      return output;
    }
    return '';
  }
}
