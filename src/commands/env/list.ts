import { ux, Flags } from '@oclif/core';
import Command from '../../base.js';

export default class EnvList extends Command {
  static description = 'list environment variables of an app';

  static flags = {
    ...Command.flags,
    app: Flags.string({ char: 'a', description: 'app id' }),
    ...ux.table.flags(),
  };

  static aliases = ['env:ls'];

  async run() {
    const { flags } = await this.parse(EnvList);

    await this.setGotConfig(flags);

    const app = flags.app || (await this.promptProject());

    // TODO: Use proper type for project
    const { project } = await this.got(`v1/projects/${app}`).json<{
      project: any;
    }>();
    ux.table(
      project.envs,
      {
        key: {},
        value: {},
      },
      flags,
    );
  }
}
