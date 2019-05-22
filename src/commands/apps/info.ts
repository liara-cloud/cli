import ora from 'ora'
import axios from 'axios'
import inquirer from 'inquirer'
import Command from '../../base'
import { createDebugLogger } from '../../utils/output'

export default class info extends Command {
  static description = 'see app information'

  static flags = {
    ...Command.flags,
  }

  spinner!: ora.Ora

  async run() {
    const { flags } = this.parse(info)
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

    const { project } = await inquirer.prompt({
      name: 'project',
      type: 'list',
      message: 'Please select a project:',
      choices: [
        ...projects.map(project => project.project_id),
      ]
    })
    this.spinner.start('Loading...');

    const { data: { project_info } } = await axios.get('/v1/projects/' + project, {
      ...this.axiosConfig,
      headers: {
        Authorization: `Bearer ${flags['api-token'] || this.readGlobalConfig()['api-token']}`
      }
    });

    this.spinner.stop()

    // console.log("---------------------------------------------------------------------");
    // console.log("\tHost:\t" + database.node.host);
    // console.log("\tPort:\t" + database.port);
    // console.log("\tType:\t" + database.type);
    // console.log("\tUserName:\t" + 'Root');
    // console.log("\tPassword:\t" + database.root_password);
    // console.log();
    console.log(project_info)
  }
}