import ora from "ora";
import inquirer from "inquirer";
import Command from "../../base";
import { Flags } from "@oclif/core";
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
    app: Flags.string({
      char: "a",
      description: "app id",
    }),
    platform: Flags.string({
      description: "platform",
    }),
    plan: Flags.string({
      description: "plan",
    }),
  };

  static aliases = ["create"];

  spinner!: ora.Ora;

  async run() {
    this.spinner = ora();
    const { flags } = await this.parse(AppCreate);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    
    const name = flags.app || (await this.promptAppName());

    const account = await this.getCurrentAccount();

    await this.setAxiosConfig(flags);

    (account && account.region === "germany" || flags.region === "germany") &&
      this.error("We do not support germany any more.");

    const platform = flags.platform || (await this.promptPlatform());
    const planID = flags.plan || (await this.promptPlan());

    try {
      await this.got.post("v1/projects/", { json: { name, planID, platform } });
      this.log(`App ${name} created.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }

      if (error.response && error.response.status === 404) {
        this.error(`Could not create the app.`);
      }

      if (error.response && error.response.status === 409) {
        this.error(
          `The app already exists. Please use a unique name for your app.`
        );
      }

      this.error(`Could not create the app. Please try again.`);
    }
  }

  async promptPlan() {
    this.spinner.start("Loading...");

    try {
      const { plans } = await this.got("v1/me").json();
      this.spinner.stop();

      const { plan } = (await inquirer.prompt({
        name: "plan",
        type: "list",
        message: "Please select a plan:",
        choices: [
          ...Object.keys(plans.projects)
            .filter(
              (plan) =>
                plans.projects[plan].available &&
                plans.projects[plan].region === "iran"
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
                )}GB,  CPU: ${cpu}${cpuSpacing(cpu)}Core,  Disk: ${disk}${
                  diskSpacing(disk) + "GB"
                }${storageClass || "SSD"},  Price: ${price.toLocaleString()}${
                  price ? priceSpacing(price) + "Tomans/Month" : ""
                }`,
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
