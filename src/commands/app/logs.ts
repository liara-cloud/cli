import path from 'path';
import fs from 'fs-extra';

import chalk from 'chalk';
import moment from 'moment';
import UAParser from 'ua-parser-js';
import * as chrono from 'chrono-node';
import { Flags, Errors } from '@oclif/core';

import Command, { IProjectDetailsResponse } from '../../base.js';
import ILiaraJSON from '../../types/liara-json.js';
import { createDebugLogger } from '../../utils/output.js';
import { BundlePlanError } from '../../errors/bundle-plan.js';

interface Entry {
  metaData: {
    releaseId: string;
  };
  values: [string, string][];
}

interface ILog {
  data: Entry[];
}

export default class AppLogs extends Command {
  static description = 'fetch the logs of an app';

  static flags = {
    ...Command.flags,
    app: Flags.string({
      char: 'a',
      description: 'app id',
      parse: async (app) => app.toLowerCase(),
    }),
    since: Flags.string({
      char: 's',
      description:
        'show logs since a specific time in the past (e.g. "1 hour ago")',
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
    const { follow, colorize, timestamps } = flags;
    const now = Math.floor(Date.now() / 1000); // current timestamp

    this.#timestamps = timestamps;
    this.#colorize = colorize;

    this.debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);

    const projectConfig = this.readProjectConfig(process.cwd());

    const project =
      flags.app || projectConfig.app || (await this.promptProject());

    const {
      project: { bundlePlanID, network },
    } = await this.got(
      `v1/projects/${project}`,
    ).json<IProjectDetailsResponse>();

    let maxSince: number;
    switch (bundlePlanID) {
      case 'free':
        maxSince = now - 3600; // 1 hour
        break;
      case 'standard':
        maxSince = now - 2592000; // 30 days
        break;
      case 'pro':
        maxSince = now - 5184000; // 60 days
        break;
      default:
        maxSince = now - 3600; // 1 hour ago
    }

    if (!network) {
      maxSince = now - 604800; // 7 days ago for projects on legacy infra
    }

    const start: number = flags.since
      ? this.getStart(`${flags.since}`)
      : maxSince;

    if (start < maxSince) {
      console.error(
        new Errors.CLIError(
          !network
            ? BundlePlanError.legacy_max_logs_period()
            : BundlePlanError.max_logs_period(bundlePlanID),
        ).render(),
      );
      process.exit(2);
    }

    let lastLogUnix: number = 0;

    while (true) {
      // Maybe find a better way of handling "lastLogUnix ?? 0"
      const logs = await this.fetchLogs(Math.max(start, lastLogUnix), project);

      if (!logs?.length && !follow) {
        break;
      }

      for (const log of logs) {
        this.#printLogLine(log);
      }

      const lastLog = logs[logs.length - 1];

      if (lastLog) {
        const unixTime = lastLog[0].slice(0, 10);
        lastLogUnix = parseInt(unixTime) + 1;
      }
      await this.sleep(1000);
    }
  }

  fetchLogs = async (since: number, appName: string) => {
    this.debug('Polling...');

    try {
      const url = `v2/projects/${appName}/logs`;
      const data = await this.got(url, {
        searchParams: {
          start: since,
          direction: 'forward',
        },
        timeout: {
          request: 10_000,
        },
      }).json<ILog>();

      return data?.data[0]?.values || [];
    } catch (error) {
      if (error.response && error.response.statusCode === 404) {
        // tslint:disable-next-line: no-console
        console.error(new Errors.CLIError('App not found.').render());
        process.exit(2);
      }

      if (error.response && error.response.statusCode === 428) {
        console.log(error.response.body);
        const message = `To view more logs, upgrade your feature bundle plan, first.
                            Then try again.
                            https://console.liara.ir/apps/${appName}/resize`;
        // tslint:disable-next-line: no-console
        console.error(new Errors.CLIError(message).render());
        process.exit(2);
      }

      this.debug(error);

      console.error(
        new Errors.CLIError(
          ' Invalid time format for --since. Please check the format and try again. Enable --debug for more details.',
        ).render(),
      );
      process.exit(2);
    }
  };

  async sleep(miliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, miliseconds));
  }

  #gray(message: string) {
    if (!this.#colorize) return message;
    return chalk.gray(message);
  }

  #printLogLine(log: [string, string]) {
    let message = JSON.parse(log[1])._entry;
    if (this.#colorize) {
      message = colorfulAccessLog(message);
    }

    if (this.#timestamps) {
      // iso string is docker's log format when using --timestamps
      message = `${this.#gray(
        moment
          .unix(parseInt(log[0].substring(0, 10)))
          .format('YYYY-MM-DDTHH:mm:ss'),
      )} ${message}`;
    }

    const socket =
      JSON.parse(log[1]).type === 'stderr' ? process.stderr : process.stdout;
    socket.write(message + '\n');
  }

  readProjectConfig(projectPath: string): ILiaraJSON {
    let content;

    const liaraJSONPath = path.join(projectPath, 'liara.json');

    const hasLiaraJSONFile = fs.existsSync(liaraJSONPath);

    if (hasLiaraJSONFile) {
      try {
        content = fs.readJSONSync(liaraJSONPath) || {};

        content.app && (content.app = content.app.toLowerCase());
      } catch (error) {
        content = {};
        this.error('Syntax error in `liara.json`!', error);
      }
    }

    return content || {};
  }

  getStart(since: string) {
    const parsedDate = chrono.parseDate(`${since}`);
    const sinceUnix = moment(parsedDate).unix();
    return sinceUnix;
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
      `${CYAN}$1${COLOR_END}`,
    )
    .replace(
      /(GET|POST|PUT|DELETE|OPTIONS|HEAD) (401|402|403|404|409)/,
      `$1 ${MAGENTO}$2${COLOR_END}`,
    )
    .replace(
      /(GET|POST|PUT|DELETE|OPTIONS|HEAD) (301|302|304)/,
      `$1 ${GRAY}$2${COLOR_END}`,
    )
    .replace(
      /(GET|POST|PUT|DELETE|OPTIONS|HEAD) (200|201|204)/,
      `$1 ${GREEN}$2${COLOR_END}`,
    )
    .replace(
      /(GET|POST|PUT|DELETE|OPTIONS|HEAD) (500|502|503|504)/,
      `$1 ${RED}$2${COLOR_END}`,
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
        '',
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
