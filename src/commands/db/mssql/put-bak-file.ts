import ora from "ora";
import chalk from "chalk";
import axios from "axios";
import inquirer from "inquirer";
import { Flags } from "@oclif/core";
import { eraseLines } from "ansi-escapes";

import Command from "../../../base";
import { IGetDatabasesResponse } from "../list";
import validURL from "../../../utils/validate-url";
import { createDebugLogger } from "../../../utils/output";

export default class MssqlBakFile extends Command {
  static description = "SQL Server bak upload";

  static flags = {
    ...Command.flags,
    database: Flags.string({
      description: "database name",
    }),
    url: Flags.string({
      description: "url",
    }),
  };

  spinner!: ora.Ora;

  async run() {
    this.spinner = ora();

    const { flags } = await this.parse(MssqlBakFile);

    const debug = createDebugLogger(flags.debug);

    await this.setAxiosConfig(flags);

    const db = flags.database || (await this.promptDatabase());
    const url = flags.url || (await this.promptBakFileUrl());

    if (!validURL(url)) {
      this.error("Invalid url");
    }

    try {
      //TODO: implement bak file upload
      await axios.post(
        `/v1/databases/${db}/mssql-bak`,
        { url },
        this.axiosConfig
      );

      this.log(
        `${chalk.greenBright(
          "OK"
        )} -- We will let you know whenever the operation is finished through notifications.`
      );
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }

      if (error.response && error.response.status === 404) {
        this.error(`Could not find the database.`);
      }

      if (error.response && error.response.status === 409) {
        this.error(`Another operation is already running. Please wait.`);
      }

      if (error.response && error.response.status === 429) {
        this.error(`Too many requests.
Sorry! Rate limit exceeded. Please try again later.`);
      }

      this.error(`Could not put bak file. Please try again.`);
    }
  }

  async promptDatabase(): Promise<string> {
    this.spinner.start("Loading...");

    this.axiosConfig.params = { type: "mssql" };

    try {
      const {
        data: { databases },
      } = await axios.get<IGetDatabasesResponse>(
        "/v1/databases",
        this.axiosConfig
      );

      this.spinner.stop();

      if (!databases.length) {
        this.warn(
          "Please go to https://console.liara.ir/databases and create a database, first."
        );

        this.exit(1);
      }

      const { database } = (await inquirer.prompt({
        name: "database",
        type: "list",
        message: "Please select an mssql database",
        choices: [...databases.map((db) => db.hostname)],
      })) as { database: string };

      return database;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptBakFileUrl(): Promise<string> {
    try {
      const { url } = (await inquirer.prompt({
        name: "url",
        type: "input",
        message: "Please enter bak file url:",
      })) as { url: string };

      return url;
    } catch (error) {
      this.log();

      if (error.message === "User abort") {
        process.stdout.write(eraseLines(2));

        console.log(`${chalk.red("> Aborted!")} No changes made.`);
        process.exit(0);
      }

      if (error.message === "stdin lacks setRawMode support") {
        this.error(
          `Interactive mode not supported – please run ${chalk.green(
            "liara login --email you@domain.com --password your_password"
          )}`
        );
      }

      throw error;
    }
  }
}
