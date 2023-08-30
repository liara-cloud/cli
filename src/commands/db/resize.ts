import ora from 'ora';
import inquirer from 'inquirer';
import Command from '../../base.js';
import { Flags } from '@oclif/core';
import { createDebugLogger } from '../../utils/output.js';
import IGetDatabasesResponse from '../../types/get-dbs-response.js';
import spacing from '../../utils/spacing.js';

export default class Hello extends Command {
  static description = 'create a new database';

  static PATH = 'v1/databases/{database-id}/resize';

  static aliases = ['db:on'];

  static flags = {
    ...Command.flags,
    hostname: Flags.string({
      char: 'a',
      description: 'hostname for your database',
    }),
    plan: Flags.string({
      char: 'p',
      description: 'new plan name',
    }),
    disk: Flags.string({
      char: 'd',
      description: 'extend disk size or not',
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
    const disk =
      flags.disk === 'y'
        ? true
        : flags.disk === 'n'
        ? false
        : (await this.promptDisk()) === 'y'
        ? true
        : false;

    try {
      const database = await this.getDatabaseByHostname(hostname);
      if (database === undefined) {
        this.log(`Database ${hostname} not found`);
        return;
      }
      const planID = flags.plan || (await this.promptPlan(database.type));
      const databaseID = database._id;
      await this.got.post(Hello.PATH.replace('{database-id}', databaseID), {
        json: { planID: planID, disk: disk },
      });
      this.log(`Database ${hostname} changed to plan ${planID}.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }
      this.error(`Could not change the plan now. Please try again later.`);
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

  async getDatabaseByHostname(hostname: string) {
    const { databases } = await this.got(
      'v1/databases'
    ).json<IGetDatabasesResponse>();

    if (!databases.length) {
      this.error(`Not found any database.
Please open up https://console.liara.ir/databases and create the database, first.`);
    }

    const database = databases.find(
      (database) => database.hostname === hostname
    );
    return database;
  }

  async promptPlan(databaseType: string) {
    this.spinner.start('Loading...');
    try {
      const { plans } = await this.got('v1/me').json<{ plans: any }>();
      this.spinner.stop();

      const { plan } = (await inquirer.prompt({
        name: 'plan',
        type: 'list',
        message: 'Please select new plan:',
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

  async promptDisk() {
    const { disk } = (await inquirer.prompt({
      name: 'disk',
      type: 'input',
      message: 'extend disk size? (y/n):',
      validate: (input) => input === 'y' || input === 'n',
    })) as { disk: string };

    return disk;
  }
}
