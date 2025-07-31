import path from 'node:path';
import fs from 'fs-extra';
import Command, { IGetProjectsResponse } from '../../base.js';
import { Flags, Errors } from '@oclif/core';
import ILiaraJSON from '../../types/liara-json.js';
import { API_IR_URL, DEV_MODE } from '../../constants.js';

interface IFlags {
  path?: string;
  'api-token'?: string;
  region?: string;
  app?: string;
  command?: string;
}

// TODO: detect and close broken connection with ping and pong
// https://www.npmjs.com/package/ws#how-to-detect-and-close-broken-connections

export default class AppShell extends Command {
  static description = 'run a command in a running applet';

  static flags = {
    ...Command.flags,
    app: Flags.string({
      char: 'a',
      description: 'app id',
      parse: async (app) => app.toLowerCase(),
    }),
    command: Flags.string({
      char: 'c',
      description: 'the command to execute',
      default: '/bin/bash',
    }),
  };

  static aliases = ['shell'];

  async run() {
    const { flags } = await this.parse(AppShell);
    const config = this.getMergedConfig(flags);

    await this.setGotConfig(config);

    const app = config.app || (await this.promptProject());

    // This is a temporary piece of code to check if the app is compatible with the new infrastructure
    // and if not, it will show an error message and exit the process.
    // This will be removed in the future. #OLD_INFRASTRUCTURE
    const projects = await this.got('v1/projects').json();
    const project = (projects as IGetProjectsResponse).projects.find(
      (project) => project.project_id === app,
    );
    if (!project!.network) {
      console.error(
        '❌ This version of Liara CLI no longer supports apps running on the old infrastructure.\n' +
          '➡️  Please migrate your app to the new infrastructure or use an older version of the CLI.\n\n' +
          '🔧 To install the last supported version:\n' +
          '   $ npm i -g @liara/cli@8.1.0\n',
      );
      process.exit(1);
    }

    const wsURL = !DEV_MODE
      ? API_IR_URL.replace('https://', 'wss://')
      : 'ws://localhost:3000';

    const teamID = flags['team-id'] ? flags['team-id'] : '';
    const ws = this.createProxiedWebsocket(
      `${wsURL}/v1/exec?token=${config['api-token']}&cmd=${flags.command}&project_id=${app}&teamID=${teamID}`,
    );

    const clearStdinEffects = () => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
        process.stdin.pause();
      }
      process.stdin.removeAllListeners();
      process.stdout.removeAllListeners();
    };

    ws.on('open', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      ws.send(
        JSON.stringify({
          action: 'start',
          cols: process.stdout.columns,
          rows: process.stdout.rows,
        }),
      );

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf-8');

        process.stdin.on('data', (data) => {
          ws.send(JSON.stringify({ type: 'input', data: data }));
        });

        process.stdout.on('resize', () => {
          ws.send(
            JSON.stringify({
              type: 'resize',
              cols: process.stdout.columns,
              rows: process.stdout.rows,
            }),
          );
        });
      } else {
        console.error(
          new Errors.CLIError(
            `Not running in a terminal, cannot set raw mode.`,
          ).render(),
        );
      }
    });

    ws.on('message', (data) => {
      // @ts-ignore
      process.stdout.write(data);
    });

    ws.on('close', () => {
      clearStdinEffects();
      process.exit(0);
    });

    ws.on('unexpected-response', (response) => {
      // @ts-ignore
      const statusCode = response.socket?._httpMessage.res.statusCode;
      statusCode === 404 &&
        console.error(new Errors.CLIError(`app '${app}' not found.`).render());
      clearStdinEffects();
      process.exit(2);
    });

    ws.on('error', (err) => {
      console.error(
        new Errors.CLIError(`Unexpected Error: ${err.message}`).render(),
      );
      clearStdinEffects();
      process.exit(2);
    });
  }

  getMergedConfig(flags: IFlags) {
    const defaults = {
      path: flags.path ? flags.path : process.cwd(),
    };
    const projectConfig = this.readProjectConfig(defaults.path);
    return {
      ...defaults,
      ...projectConfig,
      ...flags,
    };
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
}
