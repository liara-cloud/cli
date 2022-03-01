import ora from "ora";
import axios from "axios";
import inquirer from "inquirer";
import Command from "../../base";
import { flags } from "@oclif/command";
import { createDebugLogger } from "../../utils/output";
import {
  ramSpacing,
  cpuSpacing,
  diskSpacing,
  priceSpacing,
} from "../../utils/spacing";

export default class AppCreate extends Command {
  static description = "create an app";

  static flags = {
    ...Command.flags,
    app: flags.string({
      char: "a",
      description: "app id",
    }),
    platform: flags.string({
      description: "platform",
    }),
    plan: flags.string({
      description: "plan",
    }),
  };

  static aliases = ["create"];

  spinner!: ora.Ora;

  async run() {
    this.spinner = ora();
    const { flags } = this.parse(AppCreate);
    const debug = createDebugLogger(flags.debug);
    this.setAxiosConfig({
      ...this.readGlobalConfig(),
      ...flags,
    });
    const name = flags.app || (await this.promptAppName());
    const { region } = this.readGlobalConfig();
    (region === "germany" || flags.region === "germany") &&
      this.error("We do not support germany any more.");
    const platform = flags.platform || (await this.promptPlatform());
    const planID = flags.plan || (await this.promptPlan());

    try {
      await axios.post(
        `/v1/projects/`,
        {
          name,
          planID,
          platform,
        },
        this.axiosConfig
      );

      this.log(`App ${name} created.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }

      if (error.response && error.response.status === 409) {
        this.error(`The app already exists. Please use a unique name for your app.`);
      }

      this.error(`Could not create the app. Please try again.`);
    }
  }

  async promptPlan() {
    this.spinner.start("Loading...");

    try {
      const {
        data: { plans },
      } = await axios.get("/v1/me", this.axiosConfig);

      this.spinner.stop();

      const { plan } = (await inquirer.prompt({
        name: "plan",
        type: "list",
        message: "Please select a plan:",
        choices: [
          ...Object.keys(plans.projects)
            .filter(
              (plan) => plan.includes("ir-") && plans.projects[plan].available
            )
            .map((plan) => {
              const availablePlan = plans.projects[plan];
              const ram = availablePlan.RAM.amount;
              const cpu = availablePlan.CPU.amount;
              const disk = availablePlan.volume;
              const price = availablePlan.price * 720;
              const storageClass = availablePlan.storageClass;
              return {
                value: plan,
                name: `RAM: ${ram}${ramSpacing(
                  ram
                )}GB,  CPU: ${cpu}${cpuSpacing(
                  cpu
                )}Core,  Disk: ${disk}${diskSpacing(
                  disk
                )}GB ${storageClass},  Price: ${price.toLocaleString()}${priceSpacing(
                  price
                )}Tomans/Month`,
              };
            }),
        ],
      })) as { plan: string };

      return plan;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptPlatform() {
    this.spinner.start("Loading...");

    try {
      const platforms = [
        "node",
        "laravel",
        "php",
        "django",
        "flask",
        "netcore",
        "react",
        "angular",
        "vue",
        "static",
        "docker",
      ];

      this.spinner.stop();

      const { platform } = (await inquirer.prompt({
        name: "platform",
        type: "list",
        message: "Please select a platform:",
        choices: [...platforms.map((platform) => platform)],
      })) as { platform: string };

      return platform;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }
  async promptAppName(): Promise<string> {
    const { name } = (await inquirer.prompt({
      name: "name",
      type: "input",
      message: "Enter app name:",
      validate: (input) => input.length > 2,
    })) as { name: string };

    return name;
  }
}
