import axios from 'axios'
import { flags } from '@oclif/command'
import { createDebugLogger } from '../../utils/output'
import { CLIError } from '@oclif/errors'

import Command from '../../base'

export default class Set extends Command {
  static description = 'set environment varable of projects';
  static flags = {
    ...Command.flags,
    project: flags.string({ char: 'p', description: 'target project id', required: true }),
    varable: flags.string({ char: 'v', description: 'target varable' }),
  }

  static args = [{ name: 'varable' }]

  async run() {
    const { args, flags } = this.parse(Set);
    const project = flags.project;
    const varable = args.varable;

    this.debug = createDebugLogger(flags.debug);
    if (!project) {
      console.error(new CLIError('please specify a project').render())
      process.exit(2)
    }
    if (!varable) {
      console.error(new CLIError('please specify target varable').render())
      process.exit(2)
    }

    const { data: { project: { envs } } } = await axios.get(`/v1/projects/${project}`, {
      ...this.axiosConfig,
      headers: {
        Authorization: `Bearer ${flags['api-token'] || this.readGlobalConfig()['api-token']}`
      }
    });

    let splited = varable.split('=')
    let key = splited[0];
    let value = splited[1];
    let updateItem = envs.find((env) => {
      return env.key === key;
    });
    let index = envs.indexOf(updateItem);
    if (index != -1)
      envs[index].value = value;
    else
      envs.push({ key: key, value: value });

    await axios.post('/v1/projects/update-envs', { project, variables: envs }, {
      ...this.axiosConfig,
      headers: {
        Authorization: `Bearer ${flags['api-token'] || this.readGlobalConfig()['api-token']}`
      }
    });
    console.log('\t', key, ' => ', value);

  }
}
