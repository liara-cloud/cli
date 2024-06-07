import ora from 'ora';
import inquirer from 'inquirer';
import { ux } from '@oclif/core';
import { Flags } from '@oclif/core';

import Command from '../../base.js';
import { createDebugLogger } from '../../utils/output.js';

export default class Create extends Command {
  static description = 'create a new database';

  static PATH = 'v1/databases';

  static flags = {
    ...Command.flags,
    name: Flags.string({
      char: 'n',
      description: 'name of your database',
    }),
    plan: Flags.string({
      description: 'plan',
    }),
    'public-network': Flags.boolean({
      description: 'use public network or not',
    }),
    type: Flags.string({
      char: 't',
      description: 'choose which database to use',
    }),
    version: Flags.string({
      char: 'v',
      description: 'version of the database',
    }),
    yes: Flags.boolean({
      char: 'y',
      description: 'say yes to continue prompt',
    }),
    network: Flags.string({
      description: 'network',
    }),
  };

  async run(): Promise<void> {
    this.spinner = ora();

    const { flags } = await this.parse(Create);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const hostname = flags.name || (await this.promptHostname());
    const type = flags.type || (await this.promptType());
    const version = flags.version || (await this.promptVersion(type));

    const network = flags.network
      ? await this.getNetwork(flags.network)
      : await this.promptNetwork();

    const publicNetwork =
      flags['public-network'] || (await this.promptPublicNetwork()) === 'y';

    const planID = flags.plan || (await this.promptPlan(type));
    //TODO Add bundle plan flag
    const bundlePlanID =
      flags.bundlePlan || (await this.promptBundlePlan(planID));
    const sayYes = flags.yes;

    try {
      const tableData = [
        {
          type,
          version,
          hostname,
          network: network?.name,
          publicNetwork: publicNetwork.toString(),
        },
      ];

      const tableConfig = {
        Hostname: { get: (row: any) => row.hostname },
        Type: { get: (row: any) => row.type },
        Version: { get: (row: any) => row.version },
        Network: { get: (row: any) => row.network },
        'Public Network': { get: (row: any) => row.publicNetwork },
      };

      ux.table(tableData, tableConfig, {
        title: 'Database Specification',
      });

      if (!sayYes && (await this.promptContinue()) === 'n') {
        this.log('Operation cancelled');
        return;
      }

      await this.got.post(Create.PATH, {
        json: {
          hostname,
          planID,
          bundlePlanID,
          publicNetwork,
          type,
          version,
          network: network?._id,
        },
      });

      this.log(`Database ${hostname} created.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }

      if (error.response && error.response.statusCode === 404) {
        this.error(`Could not create the database.`);
      }

      if (error.response && error.response.statusCode === 409) {
        this.error(
          `The database already exists. Please use a unique name for your database.`,
        );
      }

      if (
        error.response &&
        error.response.statusCode === 403 &&
        error.response.body
      ) {
        const body = JSON.parse(error.response.body);

        if (body.data.code === 'free_plan_platform') {
          this.error(`The free plan is not available for ${type} database.`);
        }

        if (body.data.code === 'free_plan_count') {
          this.error(
            `You are allowed to create only one database on the free plan`,
          );
        }
      }

      //TODO Change the 2nd one (either 2. Make sure your plan is compatible. or 2. Make sure your plan is upgraded. )
      this.error(`Error: Unable to Create Database
        Please try the following steps:\n

        1. Check your internet connection.
        2. Make sure your plan is up to date. 
        3. Ensure you have enough balance.
        4. Verify the database name is correct.\n
        If you still have problems, please contact support by submitting a ticket at https://console.liara.ir/tickets.`);
    }
  }
  async promptBundlePlan(plan: string) {
    this.spinner.start('Loading...');
    try {
      const { plans } = await this.got('v1/me').json<{ plans: any }>();
      this.spinner.stop();

      const { bundlePlan } = (await inquirer.prompt({
        name: 'bundlePlan',
        type: 'list',
        message: 'Please select a plan:',
        choices: [
          ...Object.keys(plans.projectBundlePlans)
            .filter((bundlePlan) => {
              return bundlePlan === plan;
            })
            .map((bundlePlan) => {
              const planDetails = plans.projectBundlePlans[bundlePlan];

              return Object.keys(planDetails).map((key) => {
                const { displayPrice } = planDetails[key];
                return {
                  name: `Plan: ${key}, Price: ${displayPrice.toLocaleString()} Tomans/Month`,
                  value: key,
                };
              });
            })
            .flat(),
        ],
      })) as { bundlePlan: string };

      return bundlePlan;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptHostname() {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter name:',
      validate: (input) => input.length > 2,
    })) as { name: string };

    return name;
  }

  async promptPlan(databaseType: string) {
    this.spinner.start('Loading...');
    try {
      const { plans } = await this.got('v1/me').json<{ plans: any }>();
      this.spinner.stop();

      const { plan } = (await inquirer.prompt({
        name: 'plan',
        type: 'list',
        message: 'Please select a plan:',
        choices: [
          ...Object.keys(plans.databases)
            .filter((plan) => {
              if (
                (plan === 'free' || plan.includes('g2')) &&
                plans.databases[plan].available &&
                plans.databases[plan].supports.includes(databaseType)
              ) {
                return true;
              }
            })
            .map((plan) => {
              const availablePlan = plans.databases[plan];
              const ram = availablePlan.RAM.amount;
              const cpu = availablePlan.CPU.amount;
              const disk = availablePlan.volume;
              const price = availablePlan.price * 720;
              const storageClass = availablePlan.storageClass;
              return {
                value: plan,
                name: `RAM: ${ram}${' '.repeat(
                  5 - ram.toString().length,
                )} GB,  CPU: ${cpu}${' '.repeat(
                  6 - cpu.toString().length,
                )}Core,  Disk: ${disk}${
                  ' '.repeat(5 - disk.toString().length) + 'GB'
                }${storageClass || 'SSD'},  Price: ${price.toLocaleString()}${
                  price
                    ? ' '.repeat(7 - Math.floor(price).toString().length) +
                      'Tomans/Month'
                    : ''
                }`,
              };
            }),
        ],
      })) as { plan: string };

      return plan;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptPublicNetwork() {
    const { is_public } = (await inquirer.prompt({
      name: 'is_public',
      type: 'input',
      message: 'use public network?(y/n):',
      validate: (input) => input === 'y' || input === 'n',
    })) as { is_public: string };

    return is_public;
  }

  async promptType() {
    this.spinner.start('Loading...');
    try {
      const { databaseVersions } = await this.got('v1/me').json<{
        databaseVersions: any;
      }>();
      this.spinner.stop();

      const { databaseType } = (await inquirer.prompt({
        name: 'databaseType',
        type: 'list',
        message: 'Please select a database type:',
        choices: [...Object.keys(databaseVersions)],
      })) as { databaseType: string };

      return databaseType;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptVersion(type: string) {
    this.spinner.start('Loading...');
    try {
      const { databaseVersions } = await this.got('v1/me').json<{
        databaseVersions: any;
      }>();
      this.spinner.stop();
      const { databaseVersion } = (await inquirer.prompt({
        name: 'databaseVersion',
        type: 'list',
        message: 'Please select a version:',
        choices: [
          ...databaseVersions[type].map(
            (obj: { label: string; value: string }) => obj.value,
          ),
        ],
      })) as { databaseVersion: string };

      return databaseVersion;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptContinue() {
    const { yes } = (await inquirer.prompt({
      name: 'yes',
      type: 'input',
      message: 'continue? (y/n):',
      validate: (input) => input === 'y' || input === 'n',
    })) as { yes: string };

    return yes;
  }
}
