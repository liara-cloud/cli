import inquirer from 'inquirer';
import Command, { IConfig, IGetBucketsResponse } from '../../base.js';
import { Flags } from '@oclif/core';
import { createDebugLogger } from '../../utils/output.js';
import ora from 'ora';
import {
  OBJECT_STORAGE_API_URL_DEV,
  OBJECT_STORAGE_API_URL,
  DEV_MODE,
} from '../../constants.js';

export default class BucketDelete extends Command {
  static description = 'delete a bucket';

  static flags = {
    ...Command.flags,
    bucket: Flags.string({
      char: 'b',
      description: 'bucket name',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'force the deletion',
    }),
  };

  static aliases = ['bucket:delete'];

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: DEV_MODE ? OBJECT_STORAGE_API_URL_DEV : OBJECT_STORAGE_API_URL,
    });
  }

  async run() {
    const { flags } = await this.parse(BucketDelete);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);

    const bucket = flags.bucket || (await this.promptBuckets());

    try {
      if (flags.force) {
        await this.got.delete(`api/v1/buckets/${bucket}`);
        this.log(`Bucket ${bucket} deleted.`);
      } else if (await this.confirm(bucket)) {
        await this.got.delete(`api/v1/buckets/${bucket}`);
        this.log(`Bucket ${bucket} deleted.`);
      }
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }

      if (error.response && error.response.status === 404) {
        this.error(`Could not find the bucket.`);
      }

      if (error.response && error.response.status === 409) {
        this.error(`Another operation is already running. Please wait.`);
      }

      this.error(`Could not delete the bucket. Please try again.`);
    }
  }

  async promptBuckets() {
    this.spinner = ora();
    this.spinner.start('Loading...');
    try {
      const { buckets } = await this.got(
        'api/v1/buckets'
      ).json<IGetBucketsResponse>();

      this.spinner.stop();

      if (!buckets.length) {
        this.warn(
          'Please go to https://console.liara.ir/buckets and create an bucket, first.'
        );
        this.exit(1);
      }

      const { bucket } = (await inquirer.prompt({
        name: 'bucket',
        type: 'list',
        message: 'Please select a bucket:',
        choices: [...buckets.map((bucket) => bucket.name)],
      })) as { bucket: string };

      return bucket;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async confirm(bucket: string) {
    const { confirmation } = (await inquirer.prompt({
      name: 'confirmation',
      type: 'confirm',
      message: `Are you sure you want to delete "${bucket}"?`,
      default: false,
    })) as { confirmation: boolean };

    return confirmation;
  }
}
