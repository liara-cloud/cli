import ora from "ora";
import path from "path";
import fs from "fs-extra";
import axios from "axios";
import Command from "../base";
import inquirer from "inquirer";
import { flags } from "@oclif/command";
import { CLIError } from "@oclif/errors";
import { REGIONS_API_URL, FALLBACK_REGION } from "../constants";
import WebSocket, { createWebSocketStream } from "ws";

interface IProject {
  project_id: string;
}

interface IGetProjectsResponse {
  projects: IProject[];
}

interface IFlags {
  path?: string;
  "api-token"?: string;
  region?: string;
  app?: string;
  command?: string;
}

// TODO: detect and close broken connection with ping and pong
// https://www.npmjs.com/package/ws#how-to-detect-and-close-broken-connections

export default class Shell extends Command {
  static description = "Run a command in a running applet";

  static flags = {
    ...Command.flags,
    app: flags.string({
      char: "a",
      description: "app id",
    }),
    command: flags.string({
      char: "c",
      description: "the command to execute",
      default: "/bin/bash",
    }),
  };

  spinner!: ora.Ora;

  async run() {
    const { flags } = this.parse(Shell);
    const config: IFlags = this.getMergedConfig(flags);
    const CTRL_Q = "\u0011";
    this.setAxiosConfig(config);
    this.spinner = ora();
    if (!config.app) {
      config.app = await this.promptProject();
    }
    const wsURL = REGIONS_API_URL[config["region"] || FALLBACK_REGION].replace(
      "https://",
      "wss://"
    );

    const ws = new WebSocket(
      `${wsURL}/v1/exec?token=${config["api-token"]}&cmd=${flags.command}&project_id=${config.app}`
    );

    const duplex = createWebSocketStream(ws, { encoding: "utf8" });
    const isRaw = process.stdin.isTTY;

    const clearStdinEffects = () => {
      process.stdin.removeAllListeners();
      isRaw && process.stdin.setRawMode(isRaw);
      process.stdin.resume();
    };

    ws.on("open", () => {
      isRaw && process.stdin.setRawMode(true);

      process.stdin.setEncoding("utf8");
      process.stdin.resume();
      process.stdin.pipe(duplex);
      duplex.pipe(process.stdout);

      process.stdin.on("data", function (key) {
        if (key.toString() == CTRL_Q) {
          clearStdinEffects();
          ws.terminate();
          process.exit(0);
        }
      });
    });

    ws.on("close", () => {
      clearStdinEffects();
      process.exit(0);
    });

    ws.on("unexpected-response", (response) => {
      // @ts-ignore
      const statusCode = response.socket?._httpMessage.res.statusCode;
      statusCode === 404 &&
        console.error(new CLIError(`app '${config.app}' not found.`).render());
      clearStdinEffects();
      process.exit(2);
    });

    ws.on("error", (err) => {
      console.error(new CLIError(`Unexpected Error: ${err.message}`).render());
      clearStdinEffects();
      process.exit(2);
    });
  }

  getMergedConfig(flags: IFlags) {
    const defaults = {
      path: flags.path ? flags.path : process.cwd(),
      ...this.readGlobalConfig(),
    };
    const projectConfig = this.readProjectConfig(defaults.path);
    return {
      ...defaults,
      ...projectConfig,
      ...flags,
    };
  }

  readProjectConfig(projectPath: string) {
    let content;
    const liaraJSONPath = path.join(projectPath, "liara.json");
    const hasLiaraJSONFile = fs.existsSync(liaraJSONPath);
    if (hasLiaraJSONFile) {
      try {
        content = fs.readJSONSync(liaraJSONPath) || {};
      } catch {
        this.error("Syntax error in `liara.json`!");
      }
    }

    return content || {};
  }

  async promptProject() {
    this.spinner.start("Loading...");

    try {
      const {
        data: { projects },
      } = await axios.get<IGetProjectsResponse>(
        "/v1/projects",
        this.axiosConfig
      );

      this.spinner.stop();

      if (!projects.length) {
        this.warn(
          "Please go to https://console.liara.ir/apps and create an app, first."
        );
        this.exit(1);
      }

      const { project } = (await inquirer.prompt({
        name: "project",
        type: "list",
        message: "Please select an app:",
        choices: [...projects.map((project) => project.project_id)],
      })) as { project: string };

      return project;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }
}
