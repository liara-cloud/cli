import inquirer from "inquirer";
import Command from "../../base";
import { Flags } from "@oclif/core";
import { createDebugLogger } from "../../utils/output";
import { IEnv, IGetProjectResponse } from "./set";

export default class EnvUnset extends Command {
  static description = "remove environment variables from an app";
  static strict = false;
  static args = [
    {
      name: "env",
      description: "key",
    },
  ];

  static flags = {
    ...Command.flags,
    app: Flags.string({ char: "a", description: "app id" }),
    force: Flags.boolean({ char: "f", description: "force update" }),
  };

  async run() {
    const { flags, argv } = await this.parse(EnvUnset);

    await this.setAxiosConfig(flags);
    const debug = createDebugLogger(flags.debug);

    if (!argv.length) {
      EnvUnset.run(["-h"]);
      this.exit(0);
    }

    if(argv.join(' ').includes('=')) {
      return this.error(`You can't use '=' in the key. Please check your input.`);  
    }

    const app = flags.app || (await this.promptProject());
    const appliedEnvs = await this.fetchEnvs(app);
    const variables = appliedEnvs.filter((v) => !argv.includes(v.key));

    try {
      if (flags.force || (await this.confirm())) {
        await this.got.post(`v1/projects/update-envs`, {json: {project: app, variables}})
        this.log(`Configuration variable removed and restarting ${app}`);
      }
    } catch (error) {
      debug(error.message);
    }
  }

  async fetchEnvs(app: string): Promise<IEnv[]> {
    const {project} = await this.got(`v1/projects/${app}`).json<IGetProjectResponse>()
    const envs = project.envs.map((env) => {
      const key = env.key;
      const value = env.value;
      return { key, value };
    });

    return envs;
  }

  async confirm() {
    const { confirm } = (await inquirer.prompt({
      name: "confirm",
      type: "confirm",
      message: `Your app will be restarted due to these configuration changes. Confirm: `,
      default: false,
    })) as { confirm: boolean };

    return confirm;
  }
}