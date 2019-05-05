import axios from 'axios'
import { flags } from '@oclif/command'
import { createDebugLogger } from '../utils/output'
import { CLIError } from '@oclif/errors'

import Command from '../base'

export default class Envs extends Command {
  static description = 'set environment varable of projects'

  static flags = {
    ...Command.flags,
    project: flags.string({ char: 'p', description: 'target project id', required: true }),
    command: flags.string({ char: 'c', description: 'target command' }),
    name: flags.string({ char: 'n', description: 'name of env varable' }),
    value: flags.string({ char: 'v', description: 'value of env varable' }),
  }

  async run() {
    const { flags } = this.parse(Envs);
    const project = flags.project;
    const command = flags.command;
    const name = flags.name;
    const value = flags.value;

    this.debug = createDebugLogger(flags.debug)
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

    if (command) {
      if (!name) {
        console.error(new CLIError('please specify a varable name').render())
        process.exit(2)
      }

      if (command === 'set') {
        if (!value) {
          console.error(new CLIError('please write a value').render())
          process.exit(2);
        }
        let updateItem = envs.find((env) => {
          return env.key === name
        });
        let index = envs.indexOf(updateItem);
        if (index != -1)
          envs[index].value = value;
        else
          envs.push({ key: name, value: value });
      } else if (command === 'delete') {
        let updateItem = envs.find((env) => {
          return env.key === name
        });
        let index = envs.indexOf(updateItem);
        envs.splice(index, 1);
      }
      await axios.post('/v1/projects/update-envs', { project, variables: envs }, {
        ...this.axiosConfig,
        headers: {
          Authorization: `Bearer ${flags['api-token'] || this.readGlobalConfig()['api-token']}`
        }
      });

    } else {
      envs.forEach(env => {
        console.log('\t', env.key, ' => ', env.value);
      });
    }
  }
}