import path from 'path';
import fs from 'fs-extra';
import Command from '../../base.js';
import { Flags, Errors } from '@oclif/core';
import { REGIONS_API_URL, FALLBACK_REGION } from '../../constants.js';
import { createWebSocketStream } from 'ws';

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
    const config: IFlags = this.getMergedConfig(flags);
    const CTRL_Q = '\u0011';

    await this.setGotConfig(config);

    const app = config.app || (await this.promptProject());
    const wsURL = REGIONS_API_URL[config.region || FALLBACK_REGION].replace(
      'https://',
      'wss://'
    );

    const ws = this.createProxiedWebsocket(
      `${wsURL}/v1/exec?token=${config['api-token']}&cmd=${flags.command}&project_id=${app}`
    );

    const duplex = createWebSocketStream(ws, { encoding: 'utf8' });
    const isRaw = process.stdin.isTTY;

    const clearStdinEffects = () => {
      process.stdin.removeAllListeners();
      isRaw && process.stdin.setRawMode(isRaw);
      process.stdin.resume();
    };

    ws.on('open', () => {
      isRaw && process.stdin.setRawMode(true);

      process.stdin.setEncoding('utf8');
      process.stdin.resume();
      process.stdin.pipe(duplex);
      duplex.pipe(process.stdout);

      process.stdin.on('data', function (key) {
        if (key.toString() === CTRL_Q) {
          clearStdinEffects();
          ws.terminate();
          process.exit(0);
        }
      });
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
        new Errors.CLIError(`Unexpected Error: ${err.message}`).render()
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

  readProjectConfig(projectPath: string) {
    let content;
    const liaraJSONPath = path.join(projectPath, 'liara.json');
    const hasLiaraJSONFile = fs.existsSync(liaraJSONPath);
    if (hasLiaraJSONFile) {
      try {
        content = fs.readJSONSync(liaraJSONPath) || {};
      } catch {
        this.error('Syntax error in `liara.json`!');
      }
    }

    return content || {};
  }
}
