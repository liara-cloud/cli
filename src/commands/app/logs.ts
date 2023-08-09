import chalk from 'chalk';
import moment from 'moment';
import UAParser from 'ua-parser-js';
import { Flags, Errors } from '@oclif/core';

import Command from '../../base.js';
import { createDebugLogger } from '../../utils/output.js';

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
    timestamps: Flags.boolean({
      char: 't',
      description: 'show timestamps',
      default: false,
    }),
    follow: Flags.boolean({
      char: 'f',
      description: 'follow log output',
      default: false,
    }),
    colorize: Flags.boolean({
      char: 'c',
      description: 'colorize log output',
      default: false,
    }),
  };

  static aliases = ['logs'];

  #timestamps = false;
  #colorize = false;

  async run() {
    const { flags } = await this.parse(AppLogs);
    let since: string | number = flags.since || 1;
    const { follow, colorize, timestamps } = flags;

    this.#timestamps = timestamps;
    this.#colorize = colorize;

    this.debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);

    const project = flags.app || (await this.promptProject());

    let pendingFetch = false;
    const fetchLogs = async () => {
      if (pendingFetch) return;
      pendingFetch = true;

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
        this.#printLogLine(log);
      }

      pendingFetch = false;
    };

    if (follow) {
      fetchLogs();
      setInterval(fetchLogs, 1000);
    } else {
      await fetchLogs();
    }
  }

  #gray(message: string) {
    if (!this.#colorize) return message;
    return chalk.gray(message);
  }

  #printLogLine(log: ILog) {
    let message = log.message;
    if (this.#colorize) {
      message = colorfulAccessLog(message);
    }

    if (this.#timestamps) {
      // iso string is docker's log format when using --timestamps
      message = `${this.#gray(moment(log.datetime).toISOString())} ${message}`;
    }

    const socket = log.type === 'stderr' ? process.stderr : process.stdout;
    socket.write(message + '\n');
  }
}

function colorfulAccessLog(message: string): string {
  const COLOR_END = '\x1B[0m';
  const CYAN = '\x1B[0;36m';
  const GRAY = '\x1B[1;30m';
  const MAGENTO = '\x1B[1;35m';
  const GREEN = '\x1B[1;32m';
  const RED = '\x1B[1;31m';
  const YELLOW = '\x1B[1;33m';
  const BLUE = '\x1B[1;34m';
  return message
    .replace(
      /(((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4})/,
      `${CYAN}$1${COLOR_END}`
    )
    .replace(
      /(GET|POST|PUT|DELETE|OPTIONS|HEAD) (401|402|403|404|409)/,
      `$1 ${MAGENTO}$2${COLOR_END}`
    )
    .replace(
      /(GET|POST|PUT|DELETE|OPTIONS|HEAD) (301|302|304)/,
      `$1 ${GRAY}$2${COLOR_END}`
    )
    .replace(
      /(GET|POST|PUT|DELETE|OPTIONS|HEAD) (200|201|204)/,
      `$1 ${GREEN}$2${COLOR_END}`
    )
    .replace(
      /(GET|POST|PUT|DELETE|OPTIONS|HEAD) (500|502|503|504)/,
      `$1 ${RED}$2${COLOR_END}`
    )
    .replace('GET', `${BLUE}GET${COLOR_END}`)
    .replace('POST', `${GREEN}POST${COLOR_END}`)
    .replace('PUT', `${GREEN}PUT${COLOR_END}`)
    .replace('DELETE', `${RED}DELETE${COLOR_END}`)
    .replace('OPTIONS', `${YELLOW}OPTIONS${COLOR_END}`)
    .replace('HEAD', `${YELLOW}HEAD${COLOR_END}`)
    .replace(/(\[error\].+), client:/, `${RED}$1${COLOR_END}, client:`) // Nginx error log
    .replace(/("Mozilla.+")/, (match) => {
      var matchWithoutColors = match.replace(
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        ''
      );

      const { browser, os } = new UAParser(matchWithoutColors).getResult();
      if (!browser.name || !os.name) {
        return `${GRAY}${matchWithoutColors}${COLOR_END}`;
      }
      return `${GRAY}"${browser.name} ${browser.version || ''} - ${os.name} ${
        os.version || ''
      }"${COLOR_END}`;
    });
}
