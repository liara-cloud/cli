import fs from "fs-extra";
import { cli } from "cli-ux";
import Command from "../../base";
import { GLOBAL_CONF_PATH } from "../../constants";

interface IAccount {
  email: string;
  api_token: string;
  region: string;
}

interface IAccounts {
  [key: string]: IAccount;
}

interface ILiaraJson {
  api_token?: string;
  region?: string;
  current?: string;
  accounts?: IAccounts;
}

export default class AccountList extends Command {
  static description = "list available accounts";

  static flags = {
    ...Command.flags,
  };

  static aliases = ["account:ls"];

  async run() {
    const liara_json: ILiaraJson = this.gatherLiaraJson();
    if (
      !liara_json ||
      !liara_json.accounts ||
      Object.keys(liara_json.accounts).length === 0
    ) {
      this.error("Please add acount via 'liara account:add' command.");
    }

    const accountsData = Object.entries(liara_json.accounts).map((acc) => {
      const Name = acc[0];
      const Email = acc[1].email;
      const Region = acc[1].region;
      return { Name, Email, Region };
    });

    cli.table(accountsData, { Name: {}, Email: {}, Region: {} });
  }

  gatherLiaraJson() {
    const liara_json = fs.existsSync(GLOBAL_CONF_PATH)
      ? JSON.parse(fs.readFileSync(GLOBAL_CONF_PATH, "utf-8"))
      : undefined;
    return liara_json;
  }
}
