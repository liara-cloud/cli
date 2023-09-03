import ora from 'ora';
import inquirer from 'inquirer';
import Command from '../../base.js';
import { Args, Flags, ux } from '@oclif/core';
import { createDebugLogger } from '../../utils/output.js';
import IGetDatabasesResponse from '../../types/get-dbs-response.js';
import * as shamsi from 'shamsi-date-converter';

export interface BackUpI {
  name: string;
  lastModified: string;
  etag: string;
  size: number;
}

export interface BackupsI {
  backups: BackUpI[];
}

export default class Hello extends Command {
  static description = 'manage backups for a database';

  static PATH = 'v1/databases/{database-id}/backups';

  static flags = {
    ...Command.flags,
    hostname: Flags.string({
      char: 'a',
      description: 'hostname for your database',
    }),
    backup: Flags.string({
      char: 'b',
      description: 'select which backup to download',
    }),
  };

  static args = {
    subCommand: Args.string({
      description: 'operation',
      required: true,
      options: ['list', 'create', 'download', 'dl'],
    }),
  };

  async run(): Promise<void> {
    this.spinner = ora();

    const { flags, args } = await this.parse(Hello);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const hostname = flags.hostname || (await this.promptHostname());

    try {
      const database = await this.getDatabaseByHostname(hostname);
      if (database === undefined) {
        this.log(`Database ${hostname} not found`);
        return;
      }
      const databaseID = database._id;
      if (args.subCommand === 'create') {
        await this.got.post(Hello.PATH.replace('{database-id}', databaseID));
        this.log(`Backup task for database ${hostname} created.`);
      } else if (args.subCommand === 'list') {
        const { backups } = await this.got
          .get(Hello.PATH.replace('{database-id}', databaseID))
          .json<BackupsI>();
        const tableData = backups.map((backup) => {
          const shamsiData = shamsi.gregorianToJalali(
            new Date(backup.lastModified)
          );
          return {
            lastModified: `${shamsiData[0]}-${shamsiData[1]}-${shamsiData[2]}`,
            size: backup.size,
            name: backup.name,
          };
        });
        const tableConfig = {
          'last modified': { get: (row: any) => row.lastModified },
          size: { get: (row: any) => row.size + ' bytes' }, // TODO: output a better format for big size backups
          name: { get: (row: any) => row.name },
        };
        ux.table(tableData, tableConfig, {
          title: 'Backups',
        });
      } else if (['dl', 'download'].includes(args.subCommand)) {
        const backupName = flags.backup || (await this.promptBackupName());
        const downloadLink = await this.got
          .post(
            Hello.PATH.replace('{database-id}', databaseID) +
              `/${backupName}/download`
          )
          .json<any>();
        this.log(`download link: ${downloadLink.link}`);
      }
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }
      this.error(`Could not do the. Please try again.`);
    }
  }

  async promptHostname() {
    const { hostname } = (await inquirer.prompt({
      name: 'hostname',
      type: 'input',
      message: 'Enter hostname:',
      validate: (input) => input.length > 2,
    })) as { hostname: string };

    return hostname;
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
