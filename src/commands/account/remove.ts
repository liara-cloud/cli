import fs from "fs-extra";
import chalk from "chalk";
import Command, { IAccounts } from "../../base";
import { prompt } from "inquirer";
import { Flags } from "@oclif/core";
import { GLOBAL_CONF_PATH, GLOBAL_CONF_VERSION } from "../../constants";

export default class AccountRemove extends Command {
  static description = "remove an account";

  static flags = {
    ...Command.flags,
    account: Flags.string({ char: "a", description: "account name" }),
  };

  static aliases = ["account:rm"];

  async run() {
    const { flags } = await this.parse(AccountRemove);
    const liara_json = await this.readGlobalConfig();
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

    const accountsLength = Object.keys(liara_json.accounts).length;

    fs.writeFileSync(GLOBAL_CONF_PATH, JSON.stringify({
      version: GLOBAL_CONF_VERSION,
      accounts,
    }));
    this.log(chalk.red("Auth credentials removed."));

    selectedAccount.current &&
      accountsLength > 0 &&
        this.log(chalk.cyan("Please select an acount via 'liara account:use' command."));

    accountsLength < 1 &&
      this.log(chalk.cyan("There are no more accounts to use. Please add an account via 'liara account:add' command."));

    const {accountName} = await this.getCurrentAccount()
    accountName && this.log(chalk.cyan(`Current account is: ${accountName}`));
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
