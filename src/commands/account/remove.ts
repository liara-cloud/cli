import fs from "fs-extra";
import chalk from "chalk";
import Command, { IAccounts } from "../../base";
import { prompt } from "inquirer";
import { flags } from "@oclif/command";
import { GLOBAL_CONF_PATH } from "../../constants";

export default class AccountRemove extends Command {
  static description = "remove an account";

  static flags = {
    ...Command.flags,
    account: flags.string({ char: "a", description: "account name" }),
  };

  static aliases = ["account:rm"];

  async run() {
    const { flags } = this.parse(AccountRemove);
    const liara_json = this.readGlobalConfig();
    if (
      !liara_json ||
      !liara_json.accounts ||
      Object.keys(liara_json.accounts).length === 0
    ) {
      this.error(
        "Please add your accounts via 'liara account:add' command, first."
      );
    }
    const name = flags.account || (await this.promptName(liara_json.accounts));
    const selectedAccount = liara_json.accounts[name];
    !Boolean(selectedAccount) &&
      this.error(
        `Could not find any account associated with this name ${name}.`
      );

    const accounts = liara_json.accounts;
    delete accounts[name];

    const api_token = liara_json.current === name ? null : liara_json["api-token"];
    const region = liara_json.current === name ? null : liara_json.region;
    const current = liara_json.current === name ? null : liara_json.current;
    const accountsLength = Object.keys(liara_json.accounts).length;

    const usedLiaraJson = {
      api_token,
      region,
      current,
      accounts,
    };

    fs.writeFileSync(GLOBAL_CONF_PATH, JSON.stringify(usedLiaraJson));
    this.log(chalk.red("Auth credentials removed."));

    liara_json.current === name &&
      accountsLength > 0 &&
        this.log(chalk.cyan("Please select an acount via 'liara account:use' command."));

    accountsLength < 1 &&
      this.log(chalk.cyan("There is no more acount to use, Please add an account via 'liara account:add' command."));

    liara_json.current !== name &&
      liara_json.current !== null &&
          this.log(chalk.cyan(`Current account is: ${liara_json.current}`));
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
}
