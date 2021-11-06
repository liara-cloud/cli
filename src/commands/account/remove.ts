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

export default class AccountRemove extends Command {
  static description = "remove an account";

  static flags = {
    ...Command.flags,
    account: flags.string({ char: "a", description: "account name" }),
  };

  static aliases = ["account:rm"];

  async run() {
    const { flags } = this.parse(AccountRemove);
    const liara_json: ILiaraJson = this.readGlobalLiaraJson();
    if (
      !liara_json ||
      !liara_json.accounts ||
      Object.keys(liara_json.accounts).length === 0
    ) {
      this.error(
        "Please add your accounts via 'liara account:add' command, first."
      );
    }
    const name = flags.account || (await this.promptName());
    const selectedAccount = liara_json.accounts[name];
    !Boolean(selectedAccount) &&
      this.error(
        `Could not find any account associated with this name ${name}.`
      );

    const accounts = liara_json.accounts;
    delete accounts[name];

    const api_token = liara_json.current === name ? "" : liara_json.api_token;
    const region = liara_json.current === name ? "" : liara_json.region;
    const current = liara_json.current === name ? "" : liara_json.current;

    const usedLiaraJson = {
      api_token,
      region,
      current,
      accounts,
    };

    fs.writeFileSync(GLOBAL_CONF_PATH, JSON.stringify(usedLiaraJson));
    this.log(chalk.red("Auth credentials removed."));
    liara_json.current === name &&
      this.log(
        chalk.cyan("Please select an acount via 'liara account:use' command.")
      );

    liara_json.current !== name &&
      liara_json.current !== "" &&
      this.log(chalk.cyan(`Current account is: ${liara_json.current}`));
  }

  async promptName(): Promise<string> {
    const { accounts }: IAccounts = this.readGlobalLiaraJson();
    const { name } = (await prompt({
      name: "name",
      type: "list",
      message: "enter your account name:",
      choices: [...Object.keys(accounts)],
    })) as { name: string };
    return name;
  }

  readGlobalLiaraJson() {
    const liara_json = fs.existsSync(GLOBAL_CONF_PATH)
      ? JSON.parse(fs.readFileSync(GLOBAL_CONF_PATH, "utf-8"))
      : undefined;
    return liara_json;
  }
}
