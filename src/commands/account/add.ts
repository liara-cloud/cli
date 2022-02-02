import got from 'got'
import chalk from "chalk";
import fs from "fs-extra";
import retry from "async-retry";
import { prompt } from "inquirer";
import Command from "../../base";
import { flags } from "@oclif/command";
import promptEmail from "email-prompt-ts";
import eraseLines from "../../utils/erase-lines";
import { createDebugLogger } from "../../utils/output";
import { validate as validateEmail } from "email-validator";
import { GLOBAL_CONF_PATH, REGIONS_API_URL } from "../../constants";

export default class AccountAdd extends Command {
  static description = "add an account";

  static flags = {
    ...Command.flags,
    account: flags.string({ char: "a", description: "account name" }),
    email: flags.string({ char: "e", description: "your email" }),
    password: flags.string({ char: "p", description: "your password" }),
  };

  async run() {
    const { flags } = this.parse(AccountAdd);
    const debug = createDebugLogger(flags.debug);
    const liara_json = this.readGlobalConfig();
    const currentAccounts = liara_json.accounts;
    const name = flags.account || await this.promptName();
    const region = flags.region || await this.promptRegion();
    if (!flags.email) {
      let emailIsValid = false;
      do {
        flags.email = await this.promptEmail();
        emailIsValid = validateEmail(flags.email);
        if (!emailIsValid) {
          process.stdout.write(eraseLines(1));
        }
      } while (!emailIsValid);

      this.log();
    }
    const body = {
      email: flags.email,
      password: flags.password || await this.promptPassword(),
    };

    this.axiosConfig.baseURL = REGIONS_API_URL[region];
    this.got = got.extend({prefixUrl: REGIONS_API_URL[region]})
    const { api_token } = (await retry(
      async () => {
        try {
          const data = await this.got.post('v1/login', {json:body,  headers: { "Authorization" : undefined}}).json<{api_token: string}>()
          return data;
        } catch (err) {
          debug("retrying...");
          throw err;
        }
      },
      { retries: 3 }
    )) as { api_token: string };

    const accounts = {
      ...currentAccounts,
      [name]: {
        email: body.email,
        api_token,
        region,
      },
    };

    const current = liara_json["api-token"] ? liara_json.current : name;

    fs.writeFileSync(
      GLOBAL_CONF_PATH,
      JSON.stringify({
        api_token: liara_json["api-token"] || api_token,
        region: liara_json.region || region,
        current,
        accounts,
      })
    );

    this.log(`> Auth credentials saved in ${chalk.bold(GLOBAL_CONF_PATH)}`);
    current && this.log(`> Current account is: ${current}`);
  }

  async promptRegion(): Promise<string> {
    const { selectedRegion } = (await prompt({
      name: "selectedRegion",
      type: "list",
      message: "Please select a region:",
      choices: ["iran", "germany"],
    })) as { selectedRegion: string };

    return selectedRegion;
  }

  async promptName(): Promise<string> {
    const { name } = (await prompt({
      name: "name",
      type: "input",
      message: "Enter your prefered name:",
      validate(input) {
        if (input.length === 0) {
          return false;
        } else {
          return true;
        }
      },
    })) as { name: string };
    const liara_json = this.readGlobalConfig();
    const currentAccounts = liara_json.accounts;
    const currentAccountsName = currentAccounts && Object.keys(currentAccounts);
    return currentAccountsName?.includes(name)
      ? this.error("This name has already been used for another account. Please use a different name.")
      : name;
  }

  async promptEmail(): Promise<string> {
    try {
      return await promptEmail({
        start: `${chalk.green("?")} ${chalk.bold("Enter your email:")} `,
      });
    } catch (err) {
      this.log(); // \n

      if (err.message === "User abort") {
        process.stdout.write(eraseLines(2));
        // tslint:disable-next-line: no-console
        console.log(`${chalk.red("> Aborted!")} No changes made.`);
        process.exit(0);
      }

      if (err.message === "stdin lacks setRawMode support") {
        this.error(
          `Interactive mode not supported – please run ${chalk.green(
            "liara login --email you@domain.com --password your_password"
          )}`
        );
      }

      throw err;
    }
  }

  async promptPassword(): Promise<string> {
    const { password } = (await prompt({
      name: "password",
      type: "password",
      message: "Enter your password:",
      validate(input) {
        if (input.length === 0) {
          return false;
        }
        return true;
      },
    })) as { password: string };

    return password;
  }
}