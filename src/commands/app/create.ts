import ora from "ora";
import fs from "fs-extra";
import axios from "axios";
import inquirer from "inquirer";
import Command from "../../base";
import { flags } from "@oclif/command";
import { createDebugLogger } from "../../utils/output";

export default class AppCreate extends Command {
  static description = "create an app";

  static flags = {
    ...Command.flags,
    app: flags.string({
      char: "a",
      description: "app id",
      required: true,
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
    const app = flags.app;
    const { region } = this.readGlobalConfig();
    (region === "germany" || flags.region === "germany") &&
      this.error("We do not support germany any more.");
    if (!flags.platform) {
      flags.platform = await this.promptPlatform();
    }
    if (!flags.plan) {
      flags.plan = await this.promptPlan();
    }
    const platform = flags.platform;
    const planID = flags.plan;

    try {
      await axios.post(
        `/v1/projects/`,
        {
          name: app,
          planID,
          platform,
        },
        this.axiosConfig
      );

      this.log(`App ${app} created.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }

      if (error.response && error.response.status === 404) {
        this.error(`Could not create the app.`);
      }

      if (error.response && error.response.status === 409) {
        this.error(`Another operation is already running. Please wait.`);
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
                name: `RAM: ${ram}${this.ramSpacing(
                  ram
                )}GB,  CPU: ${cpu}${this.cpuSpacing(
                  cpu
                )}Core,  Disk: ${disk}${this.diskSpacing(
                  disk
                )}GB ${storageClass},  Price: ${price.toLocaleString()}${this.priceSpacing(
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

  ramSpacing(value: number) {
    const inputLength = value.toString().length;
    return inputLength === 1
      ? " ".repeat(3)
      : inputLength === 2
      ? " ".repeat(2)
      : inputLength === 3
      ? " "
      : "";
  }

  cpuSpacing(value: number) {
    const inputLength = value.toString().length;
    return inputLength === 1
      ? " ".repeat(4)
      : inputLength === 2
      ? " ".repeat(3)
      : inputLength === 3
      ? " ".repeat(2)
      : " ";
  }

  diskSpacing(value: number) {
    const inputLength = value.toString().length;
    return inputLength === 1
      ? " ".repeat(3)
      : inputLength === 2
      ? " ".repeat(2)
      : inputLength === 3
      ? " "
      : "";
  }

  priceSpacing(value: number) {
    const inputLength = value.toString().length;
    return inputLength === 5
      ? " ".repeat(4)
      : inputLength === 6
      ? " ".repeat(3)
      : " ";
  }
}
