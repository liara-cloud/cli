import fs from "fs-extra";
import chalk from "chalk";
import Command from "../../base";
import { prompt } from "inquirer";
import { CLIError } from "@oclif/errors";
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
    name: flags.string({ char: "n", description: "account name" }),
  };

  async run() {
    const { flags } = this.parse(AccountUse);
    const liara_json: ILiaraJson = this.gatherLiaraJson();
    if (!liara_json || !liara_json.accounts || Object.keys(liara_json.accounts).length === 0) {
      this.error("Please add acount via 'liara account:add' command.");
    }
    const name = flags.name ? flags.name : await this.promptName();
    const selectedAccount = liara_json.accounts[name];
    !Boolean(selectedAccount) &&
      this.error(`account-name ${name} is not exist!`);

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

  async promptName(): Promise<string> {
    const { accounts }: IAccounts = this.gatherLiaraJson();
    const { name } = (await prompt({
      name: "name",
      type: "list",
      message: "enter your account name:",
      choices: [...Object.keys(accounts)],
    })) as { name: string };
    return name;
  }

  gatherLiaraJson() {
    const liara_json = fs.existsSync(GLOBAL_CONF_PATH)
      ? JSON.parse(fs.readFileSync(GLOBAL_CONF_PATH, "utf-8"))
      : undefined;
    return liara_json;
  }
}
