import axios from "axios";
import Command from "../../base";
import { flags } from "@oclif/command";
import { createDebugLogger } from "../../utils/output";

export default class AppStart extends Command {
  static description = "start an app";

  static flags = {
    ...Command.flags,
    app: flags.string({
      char: "a",
      description: "app id",
    }),
  };

  static aliases = ["start"];

  async run() {
    const { flags } = this.parse(AppStart);
    const debug = createDebugLogger(flags.debug);
    this.setAxiosConfig({
      ...this.readGlobalConfig(),
      ...flags,
    });
    const app = flags.app || (await this.promptProject());

    try {
      await axios.post(
        `/v1/projects/${app}/actions/scale`,
        { scale: 1 },
        this.axiosConfig
      );

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
