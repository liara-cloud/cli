import inquirer from 'inquirer';
import Command from '../../base.js';
import { Flags, Args } from '@oclif/core';
import { createDebugLogger } from '../../utils/output.js';

export interface IEnv {
  key: string;
  value: string;
}

export interface IProject {
  envs: Array<IEnv>;
}

export interface IGetProjectResponse {
  project: IProject;
}

export default class EnvSet extends Command {
  static description = 'specifying environment variables to an app';
  static strict = false;
  static args = {
    env: Args.string({ description: 'key=value pair' }),
  };

  static flags = {
    ...Command.flags,
    app: Flags.string({ char: 'a', description: 'app id' }),
    force: Flags.boolean({ char: 'f', description: 'force update' }),
  };

  async run() {
    const { flags, argv } = await this.parse(EnvSet);

    await this.setGotConfig(flags);

    const debug = createDebugLogger(flags.debug);

    if (argv.length === 0) {
      EnvSet.run(['-h']);
      this.exit(0);
    }

    const env = this.readKeyValue(argv as string[]);
    const app = flags.app || (await this.promptProject());
    const appliedEnvs = await this.fetchEnvs(app);

    const variables = [...appliedEnvs, ...env];

    try {
      if (flags.force || (await this.confirm())) {
        await this.got.post('v1/projects/update-envs', {
          json: { project: app, variables },
        });
        this.log(`Configuration variable applied and restarting ${app}`);
      }
    } catch (error) {
      debug(error.message);
    }
  }

  async fetchEnvs(app: string): Promise<IEnv[]> {
    const { project } = await this.got(
      `v1/projects/${app}`
    ).json<IGetProjectResponse>();
    const envs = project.envs.map((env) => {
      const key = env.key;
      const value = env.value;
      return { key, value };
    });

    return envs;
  }

  splitWithDelimiter(delimiter: string, string: string): Array<string> {
    return (
      string.match(new RegExp(`(${delimiter}|[^${delimiter}]+)`, 'g')) || []
    );
  }

  removeFirstSyombol(splitedGroup: Array<string>): Array<string> {
    let counter = 0;
    const removedOne = splitedGroup.map((item: any) => {
      let content = '';
      if (item === '=') counter++;
      counter === 1 && item === '=' ? false : (content += item);
      return content;
    });
    return removedOne;
  }

  readKeyValue(env: Array<string>): IEnv[] {
    const variable = env.map((env: any) => {
      const splitWithDelimiter = this.splitWithDelimiter('=', env);
      const removedOne =
        this.removeFirstSyombol(splitWithDelimiter).filter(Boolean);
      const [tKey, ...tValue] = removedOne;
      const [key, value] = [tKey, tValue.join('')];
      return { key, value };
    });

    return variable;
  }

  async confirm() {
    const { confirm } = (await inquirer.prompt({
      name: 'confirm',
      type: 'confirm',
      message: `Your app will be restarted due to these configuration changes. Confirm: `,
      default: false,
    })) as { confirm: boolean };

    return confirm;
  }
}
