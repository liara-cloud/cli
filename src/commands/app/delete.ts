import inquirer from "inquirer";
import Command from "../../base";
import { flags } from "@oclif/command";
import { createDebugLogger } from "../../utils/output";

export default class AppDelete extends Command {
  static description = "delete an app";

  static flags = {
    ...Command.flags,
    app: flags.string({
      char: "a",
      description: "app id",
    }),
  };

  static aliases = ["delete"];

  async run() {
    const { flags } = this.parse(AppDelete);
    const debug = createDebugLogger(flags.debug);
    this.setAxiosConfig({
      ...this.readGlobalConfig(),
      ...flags,
    });
    const app = flags.app || (await this.promptProject());

    try {
      // TODO: Add --force or -f flag to force the deletion
      if (await this.confirm(app)) {
        await this.got.delete(`v1/projects/${app}`)
        this.log(`App ${app} deleted.`);
      }
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

      this.error(`Could not delete the app. Please try again.`);
    }
  }

  async confirm(app: string) {
    const { confirmation } = (await inquirer.prompt({
      name: "confirmation",
      type: "confirm",
      message: `Are you sure you want to delete "${app}"?`,
      default: false,
    })) as { confirmation: boolean };

    return confirmation;
  }
}
