import { ux } from '@oclif/core';
import Command, { IConfig } from '../../base.js';
import { IAAS_API_URL } from '../../constants.js';
import ora from 'ora';
import * as shamsi from 'shamsi-date-converter';
export default class VmList extends Command {
  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
  };

  static override description = 'list available vms';

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: IAAS_API_URL,
    });
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmList);
    await this.setGotConfig(flags);

    this.spinner = ora();

    const vms = await this.getVms(
      'There are no active vms.',
      (vm) => vm.state !== 'DELETING',
    );

    const vmsData = vms.map((vm) => {
      const shamshiDate = shamsi.gregorianToJalali(new Date(vm.createdAt));

      return {
        Name: vm.name,
        Plan: vm.plan,
        OS: vm.OS,
        State: vm.state,
        Power: vm.power,
        'Created At': `${shamshiDate[0]}-${shamshiDate[1]}-${shamshiDate[2]}`,
      };
    });

    ux.table(
      vmsData,
      {
        Name: {},
        Plan: {},
        OS: {},
        State: {},
        Power: {},
        'Created At': {},
      },
      flags,
    );
  }
}
