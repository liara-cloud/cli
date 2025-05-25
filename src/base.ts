import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';
import WebSocket from 'ws';
import ora, { Ora } from 'ora';
import inquirer from 'inquirer';
import got, { ExtendOptions, Options } from 'got';
import open, { apps, AppName } from 'open';
import { Command, Flags } from '@oclif/core';
import updateNotifier from 'update-notifier';
import getPort, { portNumbers } from 'get-port';
import { HttpsProxyAgent } from 'https-proxy-agent';

import hooks from './interceptors.js';
import browserLoginHeader from './utils/browser-login-header.js';
import {
  IBrowserLogin,
  IGetNetworkResponse,
  IVMOperations,
  IGetVMOperationsResponse,
  IGetVMsResponse,
  IVMs,
  IAccount,
  IAccounts,
  IGlobalLiaraConfig,
  IConfig,
  IProject,
  IGetProjectsResponse,
  IDomains,
  IGetDomainsResponse,
  IEnvs,
  IProjectDetails,
  IProjectDetailsResponse,
  IBucket,
  IGetBucketsResponse,
  IMailboxes,
  IGetMailboxesResponse,
  IMailPlan,
  IGetMailsAccounts,
  IGetMailsAccountsResponse,
  Files,
} from './types';
import { NoVMsFoundError } from './errors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IS_WINDOWS = os.platform() === 'win32';
const PACKAGE_JSON = fs.readJSONSync(path.join(__dirname, '..', 'package.json'));

// Initialize update notifier
updateNotifier({ pkg: PACKAGE_JSON }).notify({ isGlobal: true });

export default abstract class LiaraCommand extends Command {
  static flags = {
    help: Flags.help({ char: 'h' }),
    dev: Flags.boolean({ description: 'run in dev mode', hidden: true }),
    debug: Flags.boolean({ description: 'show debug logs' }),
    'api-token': Flags.string({
      description: 'your api token to use for authentication',
    }),
    account: Flags.string({
      description: 'temporarily switch to a different account',
    }),
    'team-id': Flags.string({
      description: 'your team id',
    }),
  };

  protected spinner: Ora = ora();
  protected got = got.extend();

  /**
   * Reads the global configuration file
   */
  async readGlobalConfig(): Promise<IGlobalLiaraConfig> {
    try {
      const content = await fs.readJSON(GLOBAL_CONF_PATH) || {
        version: GLOBAL_CONF_VERSION,
        accounts: {},
      };
      return content;
    } catch (error) {
      return {
        version: GLOBAL_CONF_VERSION,
        accounts: {},
      };
    }
  }

  async catch(error: any) {
    if (error.response?.statusCode === 401) {
      throw new Error(`Authentication failed.
Please log in using the 'liara login' command.

If you are using an API token for authentication, please consider updating your API token.`);
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      this.error(`Could not connect to ${
        error.config?.baseURL || 'https://api.liara.ir'
      }.
Please check your network connection.`);
    }

    if (error.oclif?.exit === 0) return;
    this.error(error.message);
  }

  /**
   * Configures the got instance with proper settings
   */
  async configureGotClient(config: IConfig): Promise<void> {
    const gotConfig: Partial<ExtendOptions> = {
      headers: {
        'User-Agent': this.config.userAgent,
      },
      timeout: {
        request: (config.image ? 25 : 10) * 1000,
      },
      hooks: {
        beforeRequest: [
          (options) => {
            if (options.url) {
              (options.url as URL).searchParams.set(
                'teamID',
                config['team-id'] || '',
              );
            }
          },
        ],
      },
    };

    this.configureProxy(gotConfig);
    await this.setAuthentication(config, gotConfig);
    this.setBaseUrl(config, gotConfig);

    this.got = got.extend({ hooks, ...gotConfig });
  }

  private configureProxy(gotConfig: Partial<ExtendOptions>) {
    const proxy = process.env.http_proxy || process.env.https_proxy;
    if (proxy && !IS_WINDOWS) {
      this.log(`Using proxy server ${proxy}`);
      const agent = new HttpsProxyAgent(proxy);
      gotConfig.agent = { https: agent };
    }
  }

  private async setAuthentication(config: IConfig, gotConfig: Partial<ExtendOptions>) {
    if (!config['api-token'] || !config.region) {
      const { api_token, region } = config.account
        ? await this.getAccount(config.account)
        : await this.getCurrentAccount();

      config['api-token'] = config['api-token'] || api_token;
      config.region = config.region || region;
    }

    // @ts-ignore
    gotConfig.headers.Authorization = `Bearer ${config['api-token']}`;
    config.region = config.region || FALLBACK_REGION;
  }

  private setBaseUrl(config: IConfig, gotConfig: Partial<ExtendOptions>) {
    const actualBaseURL = REGIONS_API_URL[config.region];
    gotConfig.prefixUrl = DEV_MODE ? 'http://localhost:3000' : actualBaseURL;

    if (DEV_MODE) {
      this.log(`[dev] The actual base url is: ${actualBaseURL}`);
      this.log(`[dev] but in dev mode we use http://localhost:3000`);
    }
  }

  createProxiedWebsocket(endpoint: string): WebSocket {
    const proxy = process.env.http_proxy || process.env.https_proxy;
    if (proxy && !IS_WINDOWS) {
      const agent = new HttpsProxyAgent(proxy);
      return new WebSocket(endpoint, { agent });
    }
    return new WebSocket(endpoint);
  }

  /**
   * Prompts user to select a project
   */
  async promptProject(): Promise<string> {
    this.spinner.start('Loading...');
    
    try {
      const { projects } = await this.got('v1/projects').json<IGetProjectsResponse>();
      this.spinner.stop();

      if (!projects.length) {
        this.warn('Please go to https://console.liara.ir/apps and create an app, first.');
        this.exit(1);
      }

      const { project } = await inquirer.prompt<{ project: string }>({
        name: 'project',
        type: 'list',
        message: 'Please select an app:',
        choices: projects.map(p => p.project_id),
      });

      return project;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  /**
   * Gets the current active account
   */
  async getCurrentAccount(): Promise<IAccount> {
    const accounts = (await this.readGlobalConfig()).accounts;
    const accountName = Object.keys(accounts).find(
      account => accounts[account].current,
    );
    
    if (!accountName) {
      throw new Error('No active account found');
    }

    return { 
      ...accounts[accountName], 
      accountName 
    };
  }

  /**
   * Gets a specific account by name
   */
  async getAccount(accountName: string): Promise<IAccount> {
    const accounts = (await this.readGlobalConfig()).accounts;

    if (!accounts[accountName]) {
      this.error(`Account ${accountName} not found.
Please use 'liara account add' to add this account, first.`);
    }

    return accounts[accountName];
  }

  /**
   * Handles browser-based authentication
   */
  async browserLogin(browser?: string): Promise<IBrowserLogin[]> {
    this.spinner.start('Opening browser...');
    const port = await getPort({ port: portNumbers(3001, 3100) });

    const query = new URLSearchParams({
      cli: 'v1',
      callbackURL: `localhost:${port}/callback`,
      client: 'cli',
    }).toString();

    const url = `https://console.liara.ir/login?${Buffer.from(query).toString('base64')}`;
    const app = browser ? { app: { name: apps[browser as AppName] } } : {};

    const cp = await open(url, app);

    return new Promise<IBrowserLogin[]>(async (resolve, reject) => {
      cp.on('error', reject);
      cp.on('exit', (code) => {
        if (code === 0) {
          this.spinner.succeed('Browser opened.');
          this.spinner.start('Waiting for login');
        }
      });

      const buffers: Uint8Array[] = [];
      const server = createServer(async (req, res) => {
        try {
          if (req.method === 'OPTIONS') {
            res.writeHead(204, browserLoginHeader);
            res.end();
            return;
          }

          if (req.url === '/callback' && req.method === 'POST') {
            for await (const chunk of req) {
              buffers.push(chunk);
            }

            const { data } = JSON.parse(Buffer.concat(buffers).toString() || '[]');
            res.writeHead(200, browserLoginHeader);
            res.end();

            this.spinner.stop();
            server.close();
            resolve(data);
          }
        } catch (error) {
          reject(error);
        }
      }).listen(port);
    });
  }

  /**
   * Prompts user to select a network
   */
  async promptNetwork() {
    this.spinner.start('Loading...');
    
    try {
      const { networks } = await this.got('v1/networks').json<IGetNetworkResponse>();
      this.spinner.stop();

      if (!networks.length) {
        this.warn("Please create network via 'liara network:create' command, first.");
        this.exit(1);
      }

      const { networkName } = await inquirer.prompt<{ networkName: string }>({
        name: 'networkName',
        type: 'list',
        message: 'Please select a network:',
        choices: networks.map(network => ({
          name: network.name,
          value: network.name,
        })),
      });

      return networks.find(network => network.name === networkName);
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  /**
   * Gets a network by name
   */
  async getNetwork(name: string) {
    const { networks } = await this.got('v1/networks').json<IGetNetworkResponse>();
    const network = networks.find(n => n.name === name);

    if (!network) {
      this.error(`Network ${name} not found.`);
    }

    return network;
  }

  /**
   * Gets VMs with optional filtering
   */
  async getVMs(
    errorMessage: string,
    filter?: (vm: IVMs) => boolean,
  ): Promise<IVMs[]> {
    this.spinner.start('Loading...');
    
    try {
      const { vms } = await this.got('vm').json<IGetVMsResponse>();
      
      if (!vms.length) {
        throw new NoVMsFoundError(
          "You didn't create any VMs yet.\nCreate a VM using liara VM create command.",
        );
      }

      const filteredVms = filter ? vms.filter(filter) : vms;
      
      if (!filteredVms.length) {
        throw new NoVMsFoundError(errorMessage);
      }

      this.spinner.stop();
      return filteredVms;
    } catch (error) {
      this.spinner.stop();

      if (error instanceof NoVMsFoundError) {
        throw error;
      }
      
      if (error.response?.statusCode === 401) {
        throw error;
      }
      
      throw new Error('Failed to fetch VMs');
    }
  }

  /**
   * Gets operations for a specific VM
   */
  async getVMOperations(vm: IVMs): Promise<IVMOperations[]> {
    try {
      const { operations } = await this.got(
        `vm/operation/${vm._id}`,
      ).json<IGetVMOperationsResponse>();
      
      return operations;
    } catch (error) {
      if (error.response?.statusCode === 401) {
        throw error;
      }
      
      throw new Error('Failed to fetch VM operations');
    }
  }
}
