import axios from 'axios'
import { flags } from '@oclif/command'
import { createDebugLogger } from '../../utils/output'
import { CLIError } from '@oclif/errors'

import Command from '../../base'

export default class Get extends Command {
  static description = 'get environment varable of projects';
  static flags = {
    ...Command.flags,
    project: flags.string({ char: 'p', description: 'target project id', required: true }),
  }
  static args = [{ name: 'varable' }]

  async run() {
    const { args, flags } = this.parse(Get);
    const project = flags.project;
    const varable = args.varable;
    this.debug = createDebugLogger(flags.debug);
    if (!project) {
      console.error(new CLIError('please specify a project').render())
      process.exit(2)
    }

    const { data: { project: { envs } } } = await axios.get(`/v1/projects/${project}`, {
      ...this.axiosConfig,
      headers: {
        Authorization: `Bearer ${flags['api-token'] || this.readGlobalConfig()['api-token']}`
      }
    });
    if (!varable) {
      envs.forEach(env => {
        console.log('\t', env.key, ' => ', env.value);
      });
    } else {
      let target = envs.find(env => {
        return env.key === varable;
      });
      console.log('\t', target.key, ' => ', target.value);
    }
  }
};