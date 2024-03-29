import ora, { Ora } from 'ora';
import inquirer from 'inquirer';
import { Flags } from '@oclif/core';

import Command from '../../base.js';
import { AVAILABLE_PLATFORMS } from '../../constants.js';
import { createDebugLogger } from '../../utils/output.js';

export default class AppCreate extends Command {
  static description = 'create an app';

  static flags = {
    ...Command.flags,
    app: Flags.string({
      char: 'a',
      description: 'app id',
    }),
    platform: Flags.string({
      description: 'platform',
    }),
    plan: Flags.string({
      description: 'plan',
    }),
    network: Flags.string({
      char: 'n',
      description: 'network',
    }),
    'read-only': Flags.string({
      char: 'r',
      description: 'read-only filesystem',
      options: ['true', 'false'],
    }),
  };

  static aliases = ['create'];

  spinner!: Ora;

  async run() {
    this.spinner = ora();
    const { flags } = await this.parse(AppCreate);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);

    const name = flags.app || (await this.promptAppName());

    const account = await this.getCurrentAccount();

    await this.setGotConfig(flags);

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const platform = flags.platform || (await this.promptPlatform());

    if (!AVAILABLE_PLATFORMS.includes(platform)) {
      this.error(`Unknown platform: ${platform}`);
    }

    const network = flags.network
      ? await this.getNetwork(flags.network)
      : await this.promptNetwork();

    const planID = flags.plan || (await this.promptPlan());

    const readOnly =
      flags['read-only'] === 'true'
        ? true
        : flags['read-only'] === 'false'
        ? false
        : undefined;

    try {
      await this.got.post('v1/projects/', {
        json: {
          name,
          planID,
          platform,
          network: network?._id,
          readOnlyRootFilesystem: readOnly,
        },
      });
      this.log(`App ${name} created.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }

      if (error.response && error.response.statusCode === 404) {
        this.error(`Could not create the app.`);
      }

      if (error.response && error.response.statusCode === 409) {
        this.error(
          `The app already exists. Please use a unique name for your app.`
        );
      }

      if (
        error.response &&
        error.response.statusCode === 403 &&
        error.response.body
      ) {
        const body = JSON.parse(error.response.body);

        if (body.data.code === 'free_plan_platform') {
          this.error(
            `The free plan is not available for ${platform} platform.`
          );
        }

        if (body.data.code === 'free_plan_count') {
          this.error(`You are allowed to create only one app on the free plan`);
        }
      }

      this.error(`Could not create the app. Please try again.`);
    }
  }

  async promptPlan() {
    this.spinner.start('Loading...');

    try {
      // TODO: Use proper type for plans
      const { plans } = await this.got('v1/me').json<{ plans: any }>();

      this.spinner.stop();

      const { plan } = (await inquirer.prompt({
        name: 'plan',
        type: 'list',
        message: 'Please select a plan:',
        choices: [
          ...Object.keys(plans.projects)
            .filter((plan) => {
              if (
                (plan === 'free' || plan.includes('g2')) &&
                plans.projects[plan].available &&
                plans.projects[plan].region === 'iran'
              ) {
                return true;
              }
            })
            .map((plan) => {
              const availablePlan = plans.projects[plan];
              const ram = availablePlan.RAM.amount;
              const cpu = availablePlan.CPU.amount;
              const disk = availablePlan.volume;
              const price = availablePlan.price * 720;
              const storageClass = availablePlan.storageClass;
              return {
                value: plan,
                name: `RAM: ${ram}${' '.repeat(
                  5 - ram.toString().length
                )} GB,  CPU: ${cpu}${' '.repeat(
                  6 - cpu.toString().length
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

  async promptPlatform() {
    this.spinner.start('Loading...');

    try {
      this.spinner.stop();

      const { platform } = (await inquirer.prompt({
        name: 'platform',
        type: 'list',
        message: 'Please select a platform:',
        choices: [...AVAILABLE_PLATFORMS.map((platform) => platform)],
      })) as { platform: string };

      return platform;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptAppName(): Promise<string> {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter app name:',
      validate: (input) => input.length > 2,
    })) as { name: string };

    return name;
  }
}
