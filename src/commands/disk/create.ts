import ora from "ora";
import axios from "axios";
import inquirer from "inquirer";
import Command, { IGetProjectsResponse } from "../../base";
import { Flags } from "@oclif/core";
import { createDebugLogger } from "../../utils/output";

export default class DiskCreate extends Command {
  static description = "create a disk";

  static flags = {
    ...Command.flags,
    app: Flags.string({
      char: "a",
      description: "app id",
    }),
    name: Flags.string({
      char: "n",
      description: "disk name",
    }),
    size: Flags.string({
      char: "s",
      description: "disk size",
    }),
  };

  spinner!: ora.Ora;

  async run() {
    this.spinner = ora();
    const { flags } = await this.parse(DiskCreate);
    const debug = createDebugLogger(flags.debug);
    this.setAxiosConfig({
      ...this.readGlobalConfig(),
      ...flags,
    });
    const app = flags.app || (await this.promptProject());
    const name = flags.name || (await this.promptDiskName());
    const size = flags.size || (await this.promptDiskSize());

    try {
      await axios.post(
        `/v1/projects/${app}/disks`,
        {
          name,
          size,
        },
        this.axiosConfig
      );

      this.log(`Disk ${name} created.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }

      if (error.response && error.response.status === 400 && error.response.data.message === "not_enough_storage_space") {
        this.error(`Not enough storage space.`);
      }

      if (error.response && error.response.status === 400) {
        this.error(`Invalid disk name.`);
      }

      this.error(`Could not create the disk. Please try again.`);
    }
  }

  async promptProject(): Promise<string> {
    this.spinner.start("Loading...");

    try {
      const {
        data: { projects },
      } = await axios.get<IGetProjectsResponse>(
        "/v1/projects",
        this.axiosConfig
      );

      this.spinner.stop();

      if (projects.length === 0) {
        this.warn("Please create an app via 'liara app:create' command, first.");
        this.exit(1);
      }

      const { project } = (await inquirer.prompt({
        name: "project",
        type: "list",
        message: "Please select an app:",
        choices: [...projects.map((project) => project.project_id)],
      })) as { project: string };

      return project;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptDiskName(): Promise<string> {
    const { name } = (await inquirer.prompt({
      name: "name",
      type: "input",
      message: "Enter a disk name:",
      validate: (input) => input.length > 2,
    })) as { name: string };

    return name;
  }

  async promptDiskSize(): Promise<number> {
    const { size } = (await inquirer.prompt({
      name: "size",
      type: "input",
      message: "Enter a disk size in GB:",
    })) as { size: number };

    return size;
  }
}
