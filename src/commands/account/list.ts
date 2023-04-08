import { ux } from '@oclif/core';
import Command from '../../base.js';

export default class AccountList extends Command {
  static description = 'list available accounts';

  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
  };

  static aliases = ['account:ls'];

  async run() {
    const { flags } = await this.parse(AccountList);
    const liara_json = await this.readGlobalConfig();

    if (
      !liara_json ||
      !liara_json.accounts ||
      Object.keys(liara_json.accounts).length === 0
    ) {
      this.error(
        "Please add your accounts via 'liara account:add' command, first."
      );
    }

    const accountsData = Object.entries(liara_json.accounts).map((acc) => {
      const Name = acc[0];
      const Email = acc[1].email;
      const Region = acc[1].region;
      const Current = acc[1].current ? '👍' : '';
      return { Name, Email, Region, Current };
    });

    ux.table(
      accountsData,
      { Name: {}, Email: {}, Region: {}, Current: {} },
      flags
    );
  }
}
