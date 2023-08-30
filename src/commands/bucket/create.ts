import ora, { Ora } from 'ora';
import inquirer from 'inquirer';
import Command, { IConfig } from '../../base.js';
import { Flags } from '@oclif/core';
import {
  OBJ_PLAN,
  OBJ_PERMISSION,
  REGIONS_API_URL,
  DEV_MODE,
} from '../../constants.js';
import { createDebugLogger } from '../../utils/output.js';
import spacing from '../../utils/spacing.js';

export default class BucketCreate extends Command {
  static description = 'create a bucket';

  static flags = {
    ...Command.flags,
    name: Flags.string({
      description: 'name',
    }),
    permission: Flags.string({
      description: 'permission',
    }),
    plan: Flags.string({
      description: 'plan',
    }),
  };

  static aliases = ['bucket:create'];

  spinner!: Ora;

  async setGotConfig(
    config: IConfig,
    isObjMode: boolean = true
  ): Promise<void> {
    if (isObjMode) {
      await super.setGotConfig(config);
      this.got = this.got.extend({
        prefixUrl: DEV_MODE
          ? 'http://localhost:3000'
          : REGIONS_API_URL['objStorage'],
      });
    } else {
      await super.setGotConfig(config);
    }
  }

  async run() {
    this.spinner = ora();
    const { flags } = await this.parse(BucketCreate);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);

    const name = flags.name || (await this.promptBucketName());

    const account = await this.getCurrentAccount();

    await this.setGotConfig(flags);

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const plan = flags.plan || (await this.promptPlan());

    if (!OBJ_PLAN.includes(plan)) {
      this.error(`Unknown plan: ${plan}`);
    }

    const permission = flags.permission || (await this.promptPermission());

    if (!OBJ_PERMISSION.includes(permission)) {
      this.error(`Unknown permission: ${permission}`);
    }

    try {
      await this.got.post('api/v1/buckets', {
        json: { name, plan, permission },
      });
      this.log(`Bucket ${name} created.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }

      if (error.response && error.response.statusCode === 404) {
        this.error(`Could not create the bucket.`);
      }

      if (error.response && error.response.statusCode === 409) {
        this.error(`Bucket ${name} is not available`);
      }

      this.error(`Could not create the bucket. Please try again.`);
    }
  }

  async promptPermission() {
    this.spinner.start('Loading...');

    try {
      this.spinner.stop();

      const { permission } = (await inquirer.prompt({
        name: 'permission',
        type: 'list',
        message: 'Please specify the permission:',
        choices: [...OBJ_PERMISSION.map((permission) => permission)],
      })) as { permission: string };

      return permission;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptPlan() {
    this.spinner.start('Loading...');

    const { flags } = await this.parse(BucketCreate);

    await this.setGotConfig(flags, false);

    try {
      // TODO: Use proper type for plans
      const { plans } = await this.got('v1/me').json<{ plans: any }>();
      this.spinner.stop();

      const { plan } = (await inquirer.prompt({
        name: 'plan',
        type: 'list',
        message: 'Please select a plan:',
        choices: [
          ...Object.keys(plans.objectStorage)
            .filter((plan) => {
              if (plans.objectStorage[plan].available) {
                return true;
              }
            })
            .map((plan) => {
              const availablePlan = plans.objectStorage[plan];
              const price = availablePlan.price * 720;
              const space = availablePlan.space;
              const storageClass = availablePlan.storageClass;
              return {
                value: plan,
                name: `Space: ${space}${spacing(
                  5,
                  space
                )}GB,  Storage Class: ${storageClass}${spacing(
                  5,
                  storageClass
                )},  Price: ${price.toLocaleString()}${
                  price ? spacing(7, price) + 'Tomans/Month' : ''
                }`,
              };
            }),
        ],
      })) as { plan: string };

      await this.setGotConfig(flags);

      return plan;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptBucketName(): Promise<string> {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter bucket name:',
      validate: (input) => input.length > 2,
    })) as { name: string };

    return name;
  }
}
