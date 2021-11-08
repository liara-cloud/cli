import fs from "fs-extra";
import chalk from "chalk";
import Command from "../../base";
import { prompt } from "inquirer";
import { flags } from "@oclif/command";
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

export default class AccountUse extends Command {
  static description = "select an account";

  static flags = {
    ...Command.flags,
    account: flags.string({ char: "a", description: "account name" }),
  };

  async run() {
    const { flags } = this.parse(AccountUse);
    const liara_json: ILiaraJson = this.readGlobalLiaraJson();
    if (!liara_json || !liara_json.accounts || Object.keys(liara_json.accounts).length === 0) {
      this.error("Please add your accounts via 'liara account:add' command, first.");
    }
    const name = flags.account || await this.promptName(liara_json.accounts);
    const selectedAccount = liara_json.accounts[name];
    !Boolean(selectedAccount) &&
      this.error(`Could not find any account associated with this name ${name}.`);

    const api_token = selectedAccount.api_token;
    const region = selectedAccount.region;
    const accounts = liara_json.accounts;

    const usedLiaraJson = {
      api_token,
      region,
      current: name,
      accounts,
    };

    fs.writeFileSync(GLOBAL_CONF_PATH, JSON.stringify(usedLiaraJson));
    this.log(chalk.green("> Auth credentials changed."));
  }

  async promptName(accounts: IAccounts): Promise<string> {
    const { name } = (await prompt({
      name: "name",
      type: "list",
      message: "Enter your account name:",
      choices: [...Object.keys(accounts)],
    })) as { name: string };
    return name;
  }

  readGlobalLiaraJson(): ILiaraJson {
    const liara_json = fs.existsSync(GLOBAL_CONF_PATH)
      ? JSON.parse(fs.readFileSync(GLOBAL_CONF_PATH, "utf-8"))
      : {};
    return liara_json;
  }
}
