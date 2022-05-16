import axios from "axios";
import { CliUx } from "@oclif/core";
import * as shamsi from "shamsi-date-converter";

import Command from "../../base";

export interface IDatabase {
  _id: string;
  scale: number;
  hostname: string;
  type: string;
  planID: string;
  status: string;
  created_at: string;
}

export interface IGetDatabasesResponse {
  databases: IDatabase[];
}

export default class DatabaseList extends Command {
  static description: string | undefined = "list available databases";

  static flags = {
    ...Command.flags,
    ...CliUx.ux.table.flags(),
  };

  static aliases: string[] = ["db:ls"];

  async run() {
    const { flags } = await this.parse(DatabaseList);

    await this.setAxiosConfig(flags);

    const {
      data: { databases },
    } = await axios.get<IGetDatabasesResponse>(
      "/v1/databases",
      this.axiosConfig
    );

    if (!databases.length) {
      this.error(`Not found any database.
Please open up https://console.liara.ir/databases and create the database, first.`);
    }

    const databasesData = databases.map((db) => {
      const shamsiData = shamsi.gregorianToJalali(new Date(db.created_at));
      return {
        Name: db.hostname,
        Type: db.type,
        Plan: db.planID,
        Status: db.status,
        Scale: db.scale,
        "Created At": `${shamsiData[0]}-${shamsiData[1]}-${shamsiData[2]}`,
      };
    });

    CliUx.ux.table(
      databasesData,
      {
        Name: {},
        Type: {},
        Plan: {},
        Scale: {},
        Status: {},
        "Created At": {},
      },
      flags
    );
  }
}
