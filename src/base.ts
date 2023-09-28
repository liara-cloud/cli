import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

import open from 'open';
import fs from 'fs-extra';
import WebSocket from 'ws';
import ora, { Ora } from 'ora';
import inquirer from 'inquirer';
import got, { Options } from 'got';
import { Command, Flags } from '@oclif/core';
import updateNotifier from 'update-notifier';
import getPort, { portNumbers } from 'get-port';
import { HttpsProxyAgent } from 'https-proxy-agent';

import './interceptors.js';

import {
  DEV_MODE,
  REGIONS_API_URL,
  FALLBACK_REGION,
  GLOBAL_CONF_PATH,
  GLOBAL_CONF_VERSION,
} from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const packageJson = fs.readJSONSync(path.join(__dirname, '..', 'package.json'));
updateNotifier({ pkg: packageJson }).notify({ isGlobal: true });

const isWin = os.platform() === 'win32';

const headers = {
  'Access-Control-Allow-Origin': 'https://console.liara.ir',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Allow-Headers': '*',
};

export interface IAccount {
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

export interface IEnvs {
  key: string;
  value: string;
  encrypted: boolean;
  _id: string;
}

export interface IProjectDetails {
  _id: string;
  project_id: string;
  type: string;
  status: string;
  defaultSubdomain: boolean;
  zeroDowntime: boolean;
  scale: number;
  envs: IEnvs[];
  planID: string;
  fixedIPStatus: string;
  created_at: string;
  node: {
    _id: string;
    IP: string;
  };
  hourlyPrice: number;
  isDeployed: boolean;
  reservedDiskSpace: number;
}

export interface IProjectDetailsResponse {
  project: IProjectDetails;
}

export interface IBucket {
  id: string;
  name: string;
  plan: number;
  status: string;
  permission: string;
  project_id: string;
  createdAt: string;
  updatedAt: boolean;
}

export interface IGetBucketsResponse {
  status: string;
  buckets: IBucket[];
}
export interface IMailboxes {
  plan: {
    name: string;
  };
  domain: string;
  recordsStatus: string;
  mode: string;
  status: string;
  createdAt: string;
  id: string;
  smtp_server: string;
  smtp_port: number;
}

export interface IGetMailboxesResponse {
  status: string;
  data: {
    mailServers: IMailboxes[];
  };
}

export interface IGetMailsAccounts {
  name: string;
  createdAt: string;
  id: string;
}

export interface IGetMailsAccountsResponse {
  status: string;
  data: {
    accounts: IGetMailsAccounts[];
    domain: string;
  };
}

export interface Files {
  content_type: string | null;
  data: string;
  name: string;
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
    const content = fs.readJSONSync(GLOBAL_CONF_PATH, { throws: false }) || {
      version: GLOBAL_CONF_VERSION,
      accounts: {},
    };
    return content;
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

  async browser(browser: string) {
    this.spinner = ora();

    this.spinner.start('Opening browser...');

    const port = await getPort({ port: portNumbers(3001, 3100) });

    const query = `desktop=v1&callbackURL=localhost:${port}/callback`;

    const cp = await open(
      `https://console.liara.ir/login?${Buffer.from(query).toString('base64')}`,
      {
        app: { name: browser },
      }
    );

    cp.on('error', (err) => {
      this.spinner.stop();

      this.log('\nCannot open browser.');

      this.error(`\n${err.message}`);
    });

    this.spinner.succeed('Browser opened.');

    return new Promise<
      [
        {
          email: string;
          token: string;
          avatar: string;
          region: string;
          fullname: string;
          current: boolean;
        }
      ]
    >(async (resolve) => {
      const buffers: Uint8Array[] = [];

      const server = createServer(async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, headers);
          res.end();
          return;
        }

        if (req.url === '/callback' && req.method === 'POST') {
          for await (const chunk of req) {
            buffers.push(chunk);
          }

          const { data } = JSON.parse(
            Buffer.concat(buffers).toString() || '[]'
          );

          res.writeHead(200, headers);
          res.end();

          this.spinner.stop();

          server.close();

          resolve(data);
        }
      }).listen(port, () => {
        this.spinner.start('Waiting for login');
      });
    });
  }
}
