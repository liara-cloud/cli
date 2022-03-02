import { CliUx } from "@oclif/core";
import Command, { IGetProjectsResponse } from "../../base";
import axios from "axios";
import * as shamsi from "shamsi-date-converter";

export default class AppList extends Command {
  static description = "list available apps";

  static flags = {
    ...Command.flags,
    ...CliUx.ux.table.flags(),
  };

  static aliases = ["app:ls"];

  async run() {
    const { flags } = await this.parse(AppList);
    this.setAxiosConfig({
      ...this.readGlobalConfig(),
      ...flags,
    });

    const {
      data: { projects },
    } = await axios.get<IGetProjectsResponse>("/v1/projects", this.axiosConfig);

    if (projects.length === 0) {
      this.error("Please create an app via 'liara app:create' command, first.");
    }

    const appsData = projects.map((project) => {
      const shamshiDate = shamsi.gregorianToJalali(new Date(project.created_at))
      return {
        Name: project.project_id,
        Platform: project.type,
        Plan: project.planID,
        Status: project.status,
        Scale: project.scale,
        "Created At": `${shamshiDate[0]}-${shamshiDate[1]}-${shamshiDate[2]}`,
      };
    });

    CliUx.ux.table(
      appsData,
      {
        Name: {},
        Platform: {},
        Plan: {},
        Scale: {},
        Status: {},
        "Created At": {},
      },
      flags
    );
  }
}
