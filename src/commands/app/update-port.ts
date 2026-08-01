import Command from '../../base.js';
import { Flags } from '@oclif/core';
import inquirer from 'inquirer';
import { createDebugLogger } from '../../utils/output.js';

export default class UpdatePort extends Command {
  static description = "update an app's port";

  static flags = {
    ...Command.flags,
    app: Flags.string({
      char: 'a',
      description: 'app id',
    }),
    port: Flags.integer({
      char: 'p',
      description: 'desired port',
    }),
  };

  static aliases = ['update-port', 'app:update-port'];

  async run() {
    const { flags } = await this.parse(UpdatePort);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);

    const app = flags.app ?? (await this.promptProject());
    const port = flags.port ?? (await this.promptPort());

    try {
      await this.got.post(`v1/projects/update-port`, {
        json: { port, project: app },
      });

      this.log(`App ${app} deployed with port ${port}.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }

      if (error.response && error.response.status === 404) {
        this.error(`Could not find the app.`);
      }

      if (error.response && error.response.status === 409) {
        this.error(`Another operation is already running. Please wait.`);
      }

      this.error(`Could not deploy the app. Please try again.`);
    }
  }

  async promptPort(): Promise<number> {
    const { port } = await inquirer.prompt([
      {
        name: 'port',
        message: 'Enter the desired port:',
        type: 'input',
        validate: (input: string) => {
          const num = Number(input);
          if (!Number.isInteger(num) || num < 1 || num > 65535) {
            return 'Please enter a valid port number (1-65535)';
          }
          return true;
        },
        filter: (input: string) => Number(input),
      },
    ]);

    return port;
  }
}
