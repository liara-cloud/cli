import ora from "ora";
import axios from "axios";
import inquirer from "inquirer";
import Command from "../../base";
import { flags } from "@oclif/command";
import { createDebugLogger } from "../../utils/output";

interface IProject {
  project_id: string;
}

interface IGetProjectsResponse {
  projects: IProject[];
}

export default class DiskCreate extends Command {
  static description = "create a disk";

  static flags = {
    ...Command.flags,
    app: flags.string({
      char: "a",
      description: "app id",
    }),
    disk: flags.string({
      char: "d",
      description: "disk id",
    }),
    size: flags.string({
      char: "s",
      description: "disk size",
    }),
  };

  spinner!: ora.Ora;

  async run() {
    this.spinner = ora();
    const { flags } = this.parse(DiskCreate);
    const debug = createDebugLogger(flags.debug);
    this.setAxiosConfig({
      ...this.readGlobalConfig(),
      ...flags,
    });
    const app = flags.app || (await this.promptProject());
    const disk = flags.disk || (await this.promptDiskName());
    const size = flags.size || (await this.promptDiskSize());

    try {
      await axios.post(
        `/v1/projects/${app}/disks`,
        {
          name: disk,
          size,
        },
        this.axiosConfig
      );

      this.log(`Disk ${disk} created.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }

      if (error.response && error.response.status === 400) {
        this.error(`Could not create the disk, Double-check the disk-id and disk-size.`);
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
      message: "Enter a preferred disk name:",
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
