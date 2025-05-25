import path from 'node:path';
import fs from 'fs-extra';
import chalk from 'chalk';
import moment from 'moment';
import UAParser from 'ua-parser-js';
import * as chrono from 'chrono-node';
import { Flags, Errors } from '@oclif/core';
import { setTimeout as sleep } from 'node:timers/promises';
import { type IProjectDetailsResponse, Command } from '../../base.js';
import type { ILiaraJSON } from '../../types/liara-json.js';
import { createDebugLogger } from '../../utils/output.js';
import { BundlePlanError } from '../../errors/bundle-plan.js';

interface LogEntry {
  metaData: {
    releaseId: string;
  };
  values: [string, string][];
}

interface LogResponse {
  data: LogEntry[];
}

type LogLevel = 'stdout' | 'stderr';

const COLOR_MAP = {
  cyan: '\x1B[0;36m',
  gray: '\x1B[1;30m',
  magenta: '\x1B[1;35m',
  green: '\x1B[1;32m',
  red: '\x1B[1;31m',
  yellow: '\x1B[1;33m',
  blue: '\x1B[1;34m',
  end: '\x1B[0m',
} as const;

const HTTP_METHODS = {
  GET: 'blue',
  POST: 'green',
  PUT: 'green',
  DELETE: 'red',
  OPTIONS: 'yellow',
  HEAD: 'yellow',
} as const;

const HTTP_STATUS_CODES = {
  '2xx': 'green',
  '3xx': 'gray',
  '4xx': 'magenta',
  '5xx': 'red',
} as const;

export default class AppLogs extends Command {
  static description = 'Fetch the logs of an application';
  static aliases = ['logs'];

  static flags = {
    ...Command.flags,
    app: Flags.string({
      char: 'a',
      description: 'App ID',
      parse: async (app: string) => app.toLowerCase(),
    }),
    since: Flags.string({
      char: 's',
      description: 'Show logs since a specific time (e.g. "1 hour ago")',
    }),
    timestamps: Flags.boolean({
      char: 't',
      description: 'Show timestamps',
      default: false,
    }),
    follow: Flags.boolean({
      char: 'f',
      description: 'Follow log output',
      default: false,
    }),
    colorize: Flags.boolean({
      char: 'c',
      description: 'Colorize log output',
      default: false,
    }),
  };

  private timestampsEnabled = false;
  private colorEnabled = false;
  private debugLogger = createDebugLogger(false);

  public async run(): Promise<void> {
    const { flags } = await this.parse(AppLogs);
    this.debugLogger = createDebugLogger(flags.debug);
    this.timestampsEnabled = flags.timestamps;
    this.colorEnabled = flags.colorize;

    await this.setGotConfig(flags);

    try {
      const projectConfig = this.readProjectConfig(process.cwd());
      const projectName = flags.app || projectConfig.app || (await this.promptProject());
      await this.streamLogs(projectName, flags.since, flags.follow);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private async streamLogs(projectName: string, sinceFlag?: string, follow = false): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const { maxLogsRetention } = await this.getProjectPlanDetails(projectName);
    const maxSince = now - maxLogsRetention * 86400;

    let startTimestamp = sinceFlag ? this.parseSince(sinceFlag) : maxSince;
    
    if (startTimestamp < maxSince) {
      throw new Errors.CLIError(BundlePlanError.max_logs_period(maxLogsRetention));
    }

    let lastLogTimestamp = 0;

    do {
      const logs = await this.fetchLogs(projectName, Math.max(startTimestamp, lastLogTimestamp));
      
      if (!logs.length && !follow) break;

      logs.forEach(log => this.printLog(log));
      
      const newestLog = logs[logs.length - 1];
      if (newestLog) {
        const logTimestamp = parseInt(newestLog[0].slice(0, 10));
        lastLogTimestamp = logTimestamp + 1;
      }

      await sleep(1000);
      startTimestamp = Math.max(startTimestamp + 1, lastLogTimestamp);
      this.debugLogger(`Current timestamp: ${startTimestamp}`);
    } while (follow);
  }

  private async getProjectPlanDetails(projectName: string) {
    const { project } = await this.got(`v1/projects/${projectName}`).json<IProjectDetailsResponse>();
    
    if (!project.network) {
      throw new Errors.CLIError(
        'This version of Liara CLI no longer supports apps running on the old infrastructure.\n' +
        'Please migrate your app or use an older version of the CLI.\n\n' +
        'To install the last supported version:\n' +
        '   $ npm i -g @liara/cli@8.1.0'
      );
    }

    const { plans } = await this.got('v1/me').json<{ plans: any }>();
    return {
      maxLogsRetention: plans.projectBundlePlans[project.planID][project.bundlePlanID].maxLogsRetention
    };
  }

  private async fetchLogs(projectName: string, since: number): Promise<[string, string][]> {
    this.debugLogger('Fetching logs...');

    try {
      const { data } = await this.got(`v2/projects/${projectName}/logs`, {
        searchParams: { start: since, direction: 'forward' },
        timeout: { request: 10_000 },
      }).json<LogResponse>();

      return data[0]?.values || [];
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const { response } = error as { response: { statusCode: number, body: any } };
        
        switch (response.statusCode) {
          case 404:
            throw new Errors.CLIError('App not found.');
          case 428:
            this.debugLogger(response.body);
            throw new Errors.CLIError(
              `To view more logs, upgrade your feature bundle plan first.\n` +
              `https://console.liara.ir/apps/${projectName}/resize`
            );
          default:
            this.debugLogger(response.body || response);
            throw new Errors.CLIError(
              `Failed to retrieve logs. Possible solutions:\n` +
              `1) Check console logs at https://console.liara.ir/apps/${projectName}/logs\n` +
              `2) Try 'liara logs -f --since="1 minute ago"\n` +
              `3) Enable --debug for details\n` +
              `4) Try again later`
            );
        }
      }
      throw error;
    }
  }

  private printLog([timestamp, message]: [string, string]): void {
    const parsedMessage = JSON.parse(message);
    let formattedMessage = parsedMessage._entry;
    
    if (this.colorEnabled) {
      formattedMessage = this.colorizeLog(formattedMessage);
    }

    if (this.timestampsEnabled) {
      const logTime = moment.unix(parseInt(timestamp.substring(0, 10));
      formattedMessage = `${this.colorize(logTime.format('YYYY-MM-DDTHH:mm:ss'), 'gray'} ${formattedMessage}`;
    }

    const outputStream = parsedMessage.type === 'stderr' ? process.stderr : process.stdout;
    outputStream.write(`${formattedMessage}\n`);
  }

  private colorize(text: string, color: keyof typeof COLOR_MAP): string {
    return this.colorEnabled ? `${COLOR_MAP[color]}${text}${COLOR_MAP.end}` : text;
  }

  private colorizeLog(message: string): string {
    // Colorize IP addresses
    message = message.replace(
      /(((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4})/g,
      this.colorize('$1', 'cyan')
    );

    // Colorize HTTP methods
    for (const [method, color] of Object.entries(HTTP_METHODS)) {
      message = message.replace(new RegExp(method, 'g'), this.colorize(method, color as keyof typeof COLOR_MAP));
    }

    // Colorize HTTP status codes
    message = message.replace(
      /(GET|POST|PUT|DELETE|OPTIONS|HEAD) (\d{3})/g,
      (_, method, status) => {
        const statusGroup = `${status[0]}xx` as keyof typeof HTTP_STATUS_CODES;
        const color = HTTP_STATUS_CODES[statusGroup] || 'gray';
        return `${method} ${this.colorize(status, color as keyof typeof COLOR_MAP)}`;
      }
    );

    // Colorize error messages
    message = message.replace(
      /(\[error\].+), client:/,
      `${this.colorize('$1', 'red')}, client:`
    );

    // Simplify and colorize user agents
    message = message.replace(/("Mozilla.+")/g, (match) => {
      const cleanMatch = match.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
      const { browser, os } = new UAParser(cleanMatch).getResult();
      
      return browser.name && os.name 
        ? this.colorize(`"${browser.name} ${browser.version || ''} - ${os.name} ${os.version || ''}"`, 'gray')
        : this.colorize(cleanMatch, 'gray');
    });

    return message;
  }

  private readProjectConfig(projectPath: string): ILiaraJSON {
    const configPath = path.join(projectPath, 'liara.json');
    
    if (!fs.existsSync(configPath)) {
      return {};
    }

    try {
      const config = fs.readJSONSync(configPath) || {};
      if (config.app) config.app = config.app.toLowerCase();
      return config;
    } catch (error) {
      throw new Errors.CLIError('Syntax error in liara.json file', error as Error);
    }
  }

  private parseSince(since: string): number {
    const parsedDate = chrono.parseDate(since);
    return moment(parsedDate).unix();
  }

  private handleError(error: Error): never {
    if (error instanceof Errors.CLIError) {
      console.error(error.render());
      process.exit(2);
    }

    this.debugLogger(error.stack || error.message);
    console.error(new Errors.CLIError('An unexpected error occurred').render());
    process.exit(1);
  }
}
