import Command from "../../base";
import { Flags } from "@oclif/core";
import { createDebugLogger } from "../../utils/output";

export default class AppStart extends Command {
  static description = "start an app";

  static flags = {
    ...Command.flags,
    app: Flags.string({
      char: "a",
      description: "app id",
    }),
  };

  static aliases = ["start"];

  async run() {
    const { flags } = await this.parse(AppStart);
    const debug = createDebugLogger(flags.debug);
    await this.setAxiosConfig(flags);
    const app = flags.app || (await this.promptProject());

    try {
      await this.got.post(`v1/projects/${app}/actions/scale`,{json: {scale: 1}})
      this.log(`App ${app} started.`);
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

      this.error(`Could not start the app. Please try again.`);
    }
  }
}
