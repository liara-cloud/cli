import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import fs from 'fs-extra';
import WebSocket from 'ws';
import ora, { Ora } from 'ora';
import inquirer from 'inquirer';
import got, { Options } from 'got';
import { Command, Flags } from '@oclif/core';
import updateNotifier from 'update-notifier';
import { HttpsProxyAgent } from 'https-proxy-agent';

import './interceptors.js';
import {
  DEV_MODE,
  FALLBACK_REGION,
  GLOBAL_CONF_PATH,
  PREVIOUS_GLOBAL_CONF_PATH,
  REGIONS_API_URL,
  GLOBAL_CONF_VERSION,
} from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const packageJson = fs.readJSONSync(path.join(__dirname, '..', 'package.json'));
updateNotifier({ pkg: packageJson }).notify({ isGlobal: true });

const isWin = os.platform() === 'win32';

interface IAccount {
  email: string;
  api_token?: string;
  'api-token'?: string;
  region: string;
  fullname: string;
  avatar: string;
  current: boolean;
  accountName?: string;
}

export interface IAccounts {
  [key: string]: IAccount;
}

export interface IGlobalLiaraConfig {
  version: string;
  accounts: IAccounts;
}

export interface IConfig {
  'api-token'?: string;
  region?: string;
  image?: string;
}

export interface IProject {
  _id: string;
  planID: string;
  scale: number;
  type: string;
  status: string;
  project_id: string;
  created_at: string;
  isDeployed: boolean;
}

export interface IGetProjectsResponse {
  projects: IProject[];
}

export interface IDomains {
  _id: string;
  name: string;
  type: string;
  project: {
    _id: string;
    project_id: string;
  };
  status: string;
  certificatesStatus: string;
  redirectTo: string;
  redirectStatus: number;
  created_at: string;
  CNameRecord: string;
}

export interface IGetDomainsResponse {
  domains: IDomains[];
}

export default abstract class extends Command {
  static flags = {
    help: Flags.help({ char: 'h' }),
    dev: Flags.boolean({ description: 'run in dev mode', hidden: true }),
    debug: Flags.boolean({ description: 'show debug logs' }),
    'api-token': Flags.string({
      description: 'your api token to use for authentication',
    }),
    region: Flags.string({
      description: 'the region you want to deploy your app to',
      options: ['iran', 'germany'],
    }),
  };

  got = got.extend();
  spinner!: Ora;
  async readGlobalConfig(): Promise<IGlobalLiaraConfig> {
    if (fs.existsSync(GLOBAL_CONF_PATH)) {
      fs.removeSync(PREVIOUS_GLOBAL_CONF_PATH);
      const content =
        fs.readJSONSync(GLOBAL_CONF_PATH, { throws: false }) || {};
      return content;
    }

    const content =
      fs.readJSONSync(PREVIOUS_GLOBAL_CONF_PATH, { throws: false }) || {};

    if (content.accounts && Object.keys(content.accounts).length) {
      const accounts: IAccounts = {};
      for (const account of Object.keys(content.accounts)) {
        await this.setGotConfig({
          'api-token': content.accounts[account].api_token,
          region: content.accounts[account].region,
        });
        try {
          const {
            user: { email, fullname, avatar },
          } = await this.got.get('v1/me').json<{ user: IAccount }>();

          accounts[account] = {
            email,
            avatar,
            fullname,
            region: content.accounts[account].region,
            api_token: content.accounts[account].api_token,
            current: content.current === account,
          };
        } catch (error) {
          if (!error.response) {
            this.debug(error.stack);
            this.error(error.message);
          }
        }
      }

      return { version: GLOBAL_CONF_VERSION, accounts };
    }

    if (content.api_token && content.region) {
      try {
        await this.setGotConfig({
          'api-token': content.api_token,
          region: content.region,
        });
        const {
          user: { email, fullname, avatar },
        } = await this.got.get('v1/me').json<{ user: IAccount }>();

        const accounts = {
          [`${email.split('@')[0]}_${content.region}`]: {
            email,
            avatar,
            fullname,
            current: true,
            region: content.region,
            api_token: content.api_token,
          },
        };
        return { version: GLOBAL_CONF_VERSION, accounts };
      } catch (error) {
        if (error.response) {
          return { version: GLOBAL_CONF_VERSION, accounts: {} };
        }

        this.debug(error.stack);
        this.error(error.message);
      }
    }
    // For backward compatibility with < 1.0.0 versions
    // if (content && content.api_token) {
    //   content['api-token'] = content.api_token
    //   delete content.api_token
    // }

    return { version: GLOBAL_CONF_VERSION, accounts: {} };
  }

  async catch(error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      this.error(`Could not connect to ${
        (error.config && error.config.baseURL) || 'https://api.liara.ir'
      }.
Please check your network connection.`);
    }

    if (error.oclif && error.oclif.exit === 0) return;
    this.error(error.message);
  }

  async setGotConfig(config: IConfig): Promise<void> {
    const gotConfig: Partial<Options> = {
      headers: {
        'User-Agent': this.config.userAgent,
      },
      timeout: {
        request: (config.image ? 25 : 10) * 1000,
      },
    };

    const proxy = process.env.http_proxy || process.env.https_proxy;
    if (proxy && !isWin) {
      this.log(`Using proxy server ${proxy}`);

      const agent = new HttpsProxyAgent(proxy);

      gotConfig.agent = { https: agent };
    }

    if (!config['api-token'] || !config.region) {
      const { api_token, region } = await this.getCurrentAccount();
      config['api-token'] = config['api-token'] || api_token;
      config.region = config.region || region;
    }

    // @ts-ignore
    gotConfig.headers.Authorization = `Bearer ${config['api-token']}`;

    config.region = config.region || FALLBACK_REGION;

    const actualBaseURL = REGIONS_API_URL[config.region];
    gotConfig.prefixUrl = DEV_MODE ? 'http://localhost:3000' : actualBaseURL;

    if (DEV_MODE) {
      this.log(`[dev] The actual base url is: ${actualBaseURL}`);
      this.log(`[dev] but in dev mode we use http://localhost:3000`);
    }

    this.got = got.extend(gotConfig);
  }

  createProxiedWebsocket(endpoint: string) {
    const proxy = process.env.http_proxy || process.env.https_proxy;
    if (proxy && !isWin) {
      const agent = new HttpsProxyAgent(proxy);
      return new WebSocket(endpoint, { agent });
    }

    return new WebSocket(endpoint);
  }

  async promptProject() {
    this.spinner = ora();
    this.spinner.start('Loading...');
    try {
      const { projects } = await this.got(
        'v1/projects'
      ).json<IGetProjectsResponse>();

      this.spinner.stop();

      if (!projects.length) {
        this.warn(
          'Please go to https://console.liara.ir/apps and create an app, first.'
        );
        this.exit(1);
      }

      const { project } = (await inquirer.prompt({
        name: 'project',
        type: 'list',
        message: 'Please select an app:',
        choices: [...projects.map((project) => project.project_id)],
      })) as { project: string };

      return project;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async getCurrentAccount(): Promise<IAccount> {
    const accounts = (await this.readGlobalConfig()).accounts;
    const accName = Object.keys(accounts).find(
      (account) => accounts[account].current
    );
    return { ...accounts[accName || ''], accountName: accName };
  }
}
