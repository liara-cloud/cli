import ora, { Ora } from 'ora';
import inquirer from 'inquirer';
import Command from '../../base.js';
import { Flags } from '@oclif/core';
import { AVAILABLE_PLATFORMS } from '../../constants.js';
import { createDebugLogger } from '../../utils/output.js';
import spacing from '../../utils/spacing.js';

export default class Hello extends Command {
  static description = 'create a new database';

  static PATH = 'v1/databases';

  static flags = {
    ...Command.flags,
    hostname: Flags.string({
      char: 'h',
      description: 'hostname for your database',
    }),
    plan: Flags.string({
      char: 'p',
      description: 'plan',
    }),
    publicnetwork: Flags.boolean({
      char: 'n',
      description: 'use public network or not',
    }),
    type: Flags.string({
      char: 't',
      description: 'choose which database to use',
    }),
    version: Flags.boolean({
      char: 'v',
      description: 'version of the database',
    }),
  };

  async run(): Promise<void> {
    this.spinner = ora();

    const { flags } = await this.parse(Hello);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const hostname = flags.hostname || (await this.promptHostname());
    const type = flags.type || (await this.promptType());
    const version = flags.version || (await this.promptVersion(type));
    const publicNetwork =
      flags.publicnetwork ||
      ((await this.promptPublicNetwork()) === 'y' ? true : false);

    const planID = flags.plan || (await this.promptPlan(type));

    try {
      await this.got.post(Hello.PATH, {
        json: { hostname, planID, publicNetwork, type, version },
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
          `The database already exists. Please use a unique name for your database.`
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
            `You are allowed to create only one database on the free plan`
          );
        }
      }

      this.error(`Could not create the database. Please try again.`);
    }
  }

  async promptHostname() {
    const { hostname } = (await inquirer.prompt({
      name: 'hostname',
      type: 'input',
      message: 'Enter hostname:',
      validate: (input) => input.length > 2,
    })) as { hostname: string };

    return hostname;
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
                name: `RAM: ${ram}${spacing(5, ram)}GB,  CPU: ${cpu}${spacing(
                  5,
                  cpu
                )}Core,  Disk: ${disk}${spacing(3, disk) + 'GB'}${
                  storageClass || 'SSD'
                },  Price: ${price.toLocaleString()}${
                  price ? spacing(7, price) + 'Tomans/Month' : ''
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
            (obj: { label: string; value: string }) => obj.value
          ),
        ],
      })) as { databaseVersion: string };

      return databaseVersion;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }
}
