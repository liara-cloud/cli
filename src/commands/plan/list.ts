import { CliUx } from '@oclif/core';
import Command from '../../base';
import spacing from '../../utils/spacing';

export default class PlanList extends Command {
  static description = 'list available plans';

  static flags = {
    ...Command.flags,
    ...CliUx.ux.table.flags(),
  };

  static aliases = ['plan:ls'];

  async run() {
    const { flags } = await this.parse(PlanList);

    await this.setGotConfig(flags);

    const { plans } = await this.got('v1/me').json();
    const plansData = Object.keys(plans.projects)
      .filter(
        (plan) =>
          plans.projects[plan].available &&
          plans.projects[plan].region === 'iran'
      )
      .map((plan) => {
        const Plan = plan;
        const availablePlan = plans.projects[plan];
        const tRAM = availablePlan.RAM.amount;
        const RAM = tRAM + spacing(5, tRAM) + 'GB';
        const tCPU = availablePlan.CPU.amount;
        const CPU = tCPU + spacing(5, tCPU) + 'Core';
        const StorageClass = availablePlan.storageClass;
        const tDisk = availablePlan.volume;
        const Disk = tDisk
          ? tDisk + spacing(3, tDisk) + `GB ${StorageClass}`
          : 0;
        const tPrice = availablePlan.price * 720;
        const Price = tPrice
          ? tPrice.toLocaleString() + spacing(7, tPrice) + 'Tomans/Month'
          : 0;
        return {
          Plan,
          RAM,
          CPU,
          Disk,
          Price,
        };
      });

    CliUx.ux.table(
      plansData,
      { Plan: {}, RAM: {}, CPU: {}, Disk: {}, Price: {} },
      flags
    );
  }
}
