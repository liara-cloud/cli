import axios from "axios";
import { CliUx, Flags } from "@oclif/core";
import Command from "../../base";


export default class EnvList extends Command {
  static description = "list environment variables of an app";

  static flags = {
    ...Command.flags,
    app: Flags.string({ char: "a", description: "app id" }),
    ...CliUx.ux.table.flags(),
  };

  static aliases = ["env:ls"];

  async run() {
    const { flags } = await this.parse(EnvList);
    await this.setAxiosConfig(flags);
    const app = flags.app || (await this.promptProject());

    const {
      data: { project },
    } = await axios.get(`/v1/projects/${app}`, this.axiosConfig);

    CliUx.ux.table(
      project.envs,
      {
        key: {},
        value: {},
      },
      flags
    );
  }
}
