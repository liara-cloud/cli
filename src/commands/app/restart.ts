import axios from "axios";
import Command from "../../base";
import { flags } from "@oclif/command";
import { createDebugLogger } from "../../utils/output";

export default class AppRestart extends Command {
  static description = "restart an app";

  static flags = {
    ...Command.flags,
    app: flags.string({
      char: "a",
      description: "app id",
      required: true,
    }),
  };

  static aliases = ["restart"];

  async run() {
    const { flags } = this.parse(AppRestart);
    const debug = createDebugLogger(flags.debug);
    const app = flags.app;
    this.setAxiosConfig({
      ...this.readGlobalConfig(),
      ...flags,
    });

    try {
      await axios.post(
        `/v1/projects/${app}/actions/restart`,
        null,
        this.axiosConfig
      );

      this.log(`App ${app} restarted.`);
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

      this.error(`Could not restart the app. Please try again.`);
    }
  }
}
