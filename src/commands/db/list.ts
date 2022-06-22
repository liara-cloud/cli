import { CliUx } from "@oclif/core";
import * as shamsi from "shamsi-date-converter";

import Command from "../../base";
import IGetDatabasesResponse from '../../types/get-dbs-response';
export default class DatabaseList extends Command {
  static description: string | undefined = "list available databases";

  static flags = {
    ...Command.flags,
    ...CliUx.ux.table.flags(),
  };

  static aliases: string[] = ["db:ls"];

  async run() {
    const { flags } = await this.parse(DatabaseList);

    await this.setGotConfig(flags);

    const {databases} = await this.got('v1/databases').json<IGetDatabasesResponse>()

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
