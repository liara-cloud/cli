import { ux } from '@oclif/core';
import Command, { IGetMailboxesResponse, IConfig } from '../../base.js';
import * as shamsi from 'shamsi-date-converter';
import { REGIONS_API_URL, DEV_MODE } from '../../constants.js';

export default class MailList extends Command {
  static description = 'list available mailboxes';

  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
  };

  static aliases = ['mail:ls'];

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: DEV_MODE ? 'http://localhost:3000' : REGIONS_API_URL['mail'],
    });
  }

  async run() {
    const { flags } = await this.parse(MailList);

    await this.setGotConfig(flags);

    const { data } = await this.got(
      'api/v1/mails'
    ).json<IGetMailboxesResponse>();
    if (data.mailServers.length === 0) {
      this.error(
        "Please create an app via 'liara mail:create' command, first."
      );
    }

    const mailsData = data.mailServers.map((mail) => {
      const shamshiDate = shamsi.gregorianToJalali(new Date(mail.createdAt));
      return {
        domain: mail.domain,
        recordsStatus: mail.recordsStatus,
        mode: mail.mode,
        status: mail.status,
        'Created At': `${shamshiDate[0]}-${shamshiDate[1]}-${shamshiDate[2]}`,
      };
    });

    ux.table(
      mailsData,
      {
        domain: {},
        recordsStatus: {},
        mode: {},
        status: {},
        'Created At': {},
      },
      flags
    );
  }
}
