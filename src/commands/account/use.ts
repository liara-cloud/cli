import fs from "fs-extra";
import chalk from "chalk";
import Command, { IAccounts } from "../../base";
import { prompt } from "inquirer";
import { Flags } from "@oclif/core";
import { GLOBAL_CONF_PATH, GLOBAL_CONF_VERSION } from "../../constants";

export default class AccountUse extends Command {
  static description = "select an account";

  static flags = {
    ...Command.flags,
    account: Flags.string({ char: "a", description: "account name" }),
  };

  async run() {
    const { flags } = await this.parse(AccountUse);
    const liara_json = await this.readGlobalConfig();
    if (!liara_json || !liara_json.accounts || Object.keys(liara_json.accounts).length === 0) {
      this.error("Please add your accounts via 'liara account:add' command, first.");
    }
    const name = flags.account || await this.promptName(liara_json.accounts);
    const selectedAccount = liara_json.accounts[name];
    !Boolean(selectedAccount) &&
      this.error(`Could not find any account associated with this name ${name}.`);

    for (const account of Object.keys(liara_json.accounts)) {
      liara_json.accounts[account].current = false
      if (name === account) {
        liara_json.accounts[account].current = true
      }
    }

    fs.writeFileSync(GLOBAL_CONF_PATH, JSON.stringify({
      version: GLOBAL_CONF_VERSION,
      accounts: liara_json.accounts
    }));
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
}
