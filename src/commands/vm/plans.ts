import { ux } from '@oclif/core';

import VmCommand from '../../vm-command.js';
import { IGetVMPlansResponse } from '../../types/vm.js';
import { createDebugLogger } from '../../utils/output.js';
import { getSelectablePlans } from '../../utils/vm.js';

export default class VmPlans extends VmCommand {
  static description = 'list the available vm plans';

  static flags = {
    ...VmCommand.flags,
    ...ux.table.flags(),
  };

  static aliases = ['vm:plan:list'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmPlans);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      this.spinner.start('Loading...');
      const { plans } = await this.got('plans').json<IGetVMPlansResponse>();
      this.spinner.stop();

      ux.table(
        getSelectablePlans(plans).map((key) => ({
          Plan: key,
          RAM: plans[key].RAM.amount,
          CPU: plans[key].CPU.amount,
          Disk: plans[key].volume,
          Price: plans[key].monthlyPrice.toLocaleString(),
        })),
        {
          Plan: {},
          RAM: { header: 'RAM(GB)' },
          CPU: { header: 'CPU(Core)' },
          Disk: { header: 'Disk(GB SSD)' },
          Price: { header: 'Price(Tomans/Month)' },
        },
        flags,
      );
    } catch (error) {
      this.spinner.stop();
      this.fail(error, debug);
    }
  }
}
