import chalk from 'chalk';
import moment from 'moment';
import { Flags, Errors } from '@oclif/core';

import Command from '../../base';
import { createDebugLogger } from '../../utils/output';

interface ILog {
  type: string;
  datetime: string;
  message: string;
}

export default class AppLogs extends Command {
  static description = 'fetch the logs of an app';

  static flags = {
    ...Command.flags,
    app: Flags.string({ char: 'a', description: 'app id' }),
    since: Flags.integer({
      char: 's',
      description: 'show logs since timestamp',
    }),
  };

  static aliases = ['logs'];

  async run() {
    const { flags } = await this.parse(AppLogs);
    let since: string | number = flags.since || 1;

    this.debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);

    const project = flags.app || (await this.promptProject());

    setInterval(async () => {
      this.debug('Polling...');

      let logs: ILog[] = [];

      try {
        const data = await this.got(
          `v1/projects/${project}/logs?since=${since}`
        ).json<ILog[]>();
        logs = data;
      } catch (error) {
        if (error.response && error.response.status === 404) {
          // tslint:disable-next-line: no-console
          console.error(new Errors.CLIError('App not found.').render());
          process.exit(2);
        }

        this.debug(error.stack);
      }

      const lastLog = logs[logs.length - 1];

      if (lastLog && lastLog.datetime === 'Error') {
        // tslint:disable-next-line: no-console
        console.error(
          new Errors.CLIError(`${lastLog.message}
Sorry for inconvenience. Please contact us.`).render()
        );
        process.exit(1);
      }

      if (lastLog) {
        since = moment(lastLog.datetime).unix() + 1;
      }

      for (const log of logs) {
        const datetime = chalk.gray(
          moment(log.datetime).format('YYYY-MM-DD HH:mm:ss')
        );
        this.log(`${datetime} | ${log.message}`);
      }
    }, 1000);
  }
}
