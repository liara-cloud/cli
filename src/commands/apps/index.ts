import ora from 'ora'
import axios from 'axios'
import moment from 'moment'
import chalk from 'chalk'
// tslint:disable-next-line: no-implicit-dependencies
import { CLIError } from '@oclif/errors'

import Command from '../../base'
import { createDebugLogger } from '../../utils/output'

export default class Apps extends Command {
  static description = 'see all project list'

  static flags = {
    ...Command.flags,
  }

  spinner!: ora.Ora

  async run() {
    const { flags } = this.parse(Apps)
    this.debug = createDebugLogger(flags.debug)
    this.spinner = ora()

    this.spinner.start('Loading...');
    const { data: { projects } } = await axios.get('/v1/projects', {
      ...this.axiosConfig,
      headers: {
        Authorization: `Bearer ${flags['api-token'] || this.readGlobalConfig()['api-token']}`
      }
    });
    this.spinner.stop()

    if (!projects.length) {
      this.warn('Please go to https://console.liara.ir/projects and create a project, first.')
      this.exit(1)
    }
    console.log("\n" + chalk.grey('#') + "\tProject Id\tType\tStatus\tCreated at\n---------------------------------------------------------------------");
    projects.map((project, index) => {
      console.log(index + '\t' + project.project_id + '\t' + project.type + '\t' + project.status + '\t' + moment(new Date(project.created_at)).format('YYYY-MM-DD HH:mm:ss'));
    });
    console.log();
  }
}