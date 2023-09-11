import { ux } from '@oclif/core';
import Command, { IConfig, IGetBucketsResponse } from '../../base.js';
import * as shamsi from 'shamsi-date-converter';
import {
  OBJECT_STORAGE_API_URL_DEV,
  OBJECT_STORAGE_API_URL,
  DEV_MODE,
} from '../../constants.js';

export default class BucketList extends Command {
  static description = 'list available buckets';

  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
  };

  static aliases = ['bucket:ls'];

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: DEV_MODE
        ? OBJECT_STORAGE_API_URL_DEV['devUri']
        : OBJECT_STORAGE_API_URL['prodUri'],
    });
  }

  async run() {
    const { flags } = await this.parse(BucketList);

    await this.setGotConfig(flags);

    const { buckets } = await this.got(
      'api/v1/buckets'
    ).json<IGetBucketsResponse>();
    if (buckets.length === 0) {
      this.error(
        "Please create an bucket via 'liara bucket:create' command, first."
      );
    }

    const bucketsData = buckets.map((bucket) => {
      const shamshiDate = shamsi.gregorianToJalali(new Date(bucket.createdAt));
      return {
        Name: bucket.name,
        Plan: bucket.plan,
        Status: bucket.status,
        Permission: bucket.permission,
        'Created At': `${shamshiDate[0]}-${shamshiDate[1]}-${shamshiDate[2]}`,
      };
    });

    ux.table(
      bucketsData,
      {
        Name: {},
        Plan: {},
        Status: {},
        Permission: {},
        'Created At': {},
      },
      flags
    );
  }
}
