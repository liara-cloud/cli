import ora from 'ora'
import axios from 'axios'
import moment from 'moment'
import chalk from 'chalk'
// tslint:disable-next-line: no-implicit-dependencies
import { CLIError } from '@oclif/errors'

import Command from '../../base'
import { createDebugLogger } from '../../utils/output'

export default class Databases extends Command {
  static description = 'see all database list'

  static flags = {
    ...Command.flags,
  }

  spinner!: ora.Ora

  async run() {
    const { flags } = this.parse(Databases)
    this.debug = createDebugLogger(flags.debug)
    this.spinner = ora()

    this.spinner.start('Loading...');
    const { data: { databases } } = await axios.get('/v1/databases', {
      ...this.axiosConfig,
      headers: {
        Authorization: `Bearer ${flags['api-token'] || this.readGlobalConfig()['api-token']}`
      }
    });
    this.spinner.stop()

    if (!databases.length) {
      this.warn('Please go to https://console.liara.ir/databases and create a database, first.')
      this.exit(1)
    }

    console.log("\n" + chalk.grey('#') + "\tName\tType\tStatus\tCreated at\n---------------------------------------------------------------------");
    databases.map((database, index) => {
      console.log(chalk.grey(index) + '\t' + database.name + '\t' + database.type + '\t' + database.status + '\t' + moment(new Date(database.created_at)).format('YYYY-MM-DD HH:mm:ss'));
    });
    console.log();
  }
}