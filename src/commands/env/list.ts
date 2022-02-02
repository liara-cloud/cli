import { cli } from "cli-ux";
import Command from "../../base";
import { flags } from "@oclif/command";

export default class EnvList extends Command {
  static description = "list environment variables of an app";

  static flags = {
    ...Command.flags,
    app: flags.string({ char: "a", description: "app id" }),
    ...cli.table.flags(),
  };

  static aliases = ["env:ls"];

  async run() {
    const { flags } = this.parse(EnvList);
    this.setAxiosConfig({
      ...this.readGlobalConfig(),
      ...flags,
    });
    const app = flags.app || (await this.promptProject());

    const {project} = await this.got(`v1/projects/${app}`).json()
    cli.table(
      project.envs,
      {
        key: {},
        value: {},
      },
      flags
    );
  }
}
