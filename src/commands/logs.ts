import axios from 'axios'
import chalk from 'chalk'
import moment from 'moment'
import {flags} from '@oclif/command'
// tslint:disable-next-line: no-implicit-dependencies
import {CLIError} from '@oclif/errors'

import Command from '../base'
import {createDebugLogger} from '../utils/output'

interface ILog {
  type: string,
  datetime: string,
  message: string,
}

export default class Logs extends Command {
  static description = 'see a project\'s logs'

  static flags = {
    ...Command.flags,
    project: flags.string({char: 'p', description: 'project id', required: true}),
  }

  async run() {
    let since: string | number = 1
    const {flags} = this.parse(Logs)
    const project = flags.project

    this.debug = createDebugLogger(flags.debug)

    setInterval(async () => {
      this.debug('Polling...')

      let logs: ILog[] = []

      try {
        const {data} = await axios.get<ILog[]>(`/v1/projects/${project}/logs?since=${since}`, {
          ...this.axiosConfig,
          headers: {
            Authorization: `Bearer ${flags['api-token'] || this.readGlobalConfig()['api-token']}`
          }
        })

        logs = data
      } catch (error) {
        if (error.response && error.response.status === 400) {
          // tslint:disable-next-line: no-console
          console.error(new CLIError('Project not found.').render())
          process.exit(2)
        }

        this.debug(error.stack)
      }

      const lastLog = logs[logs.length - 1]

      if (lastLog && lastLog.datetime === 'Error') {
        // tslint:disable-next-line: no-console
        console.error(new CLIError(`${lastLog.message}
Sorry for inconvenience. Please contact us.`).render())
        process.exit(1)
      }

      if (lastLog) {
        since = moment(lastLog.datetime).unix() + 1
      }

      for (const log of logs) {
        const datetime = chalk.gray(moment(log.datetime).format('YYYY-MM-DD HH:mm:ss'))
        this.log(`${datetime} | ${log.message}`)
      }
    }, 1000)
  }
}
