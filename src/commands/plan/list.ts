import { ux } from '@oclif/core';
import Command from '../../base.js';

export default class PlanList extends Command {
  static description = 'list available plans';

  static flags = {
    ...Command.flags,
    ...ux.table.flags(),
  };

  static aliases = ['plan:ls'];

  async run() {
    try {
      const { flags } = await this.parse(PlanList);

      await this.setGotConfig(flags);

      // TODO: Use proper type for plans
      const { plans } = await this.got('v1/me').json<{ plans: any }>();
      const plansData = Object.keys(plans.projects)
        .filter(
          (plan) =>
            plan.includes('g2') &&
            plans.projects[plan].available &&
            plans.projects[plan].region === 'iran',
        )
        .map((plan) => {
          const Plan = plan;
          const BundlePlan = plans.projectBundlePlans[plan];
          const Basic = BundlePlan.basic.displayPrice.toLocaleString();
          const Standard = BundlePlan.standard.displayPrice.toLocaleString();
          const Pro = BundlePlan.pro.displayPrice.toLocaleString();

          const availablePlan = plans.projects[plan];
          const RAM = availablePlan.RAM.amount;
          const CPU = availablePlan.CPU.amount;
          const Disk = availablePlan.volume;
          const tPrice = availablePlan.price * 720;
          const Price = tPrice ? tPrice.toLocaleString() : 0;
          return {
            Plan,
            RAM,
            CPU,
            Disk,
            Price,
            Basic,
            Standard,
            Pro,
          };
        });

      ux.table(
        plansData,
        {
          Plan: {},
          RAM: { header: 'RAM(GB)' },
          CPU: { header: 'CPU(Core)' },
          Disk: { header: 'Disk(GB SSD)' },
          Price: { header: 'Price(Tomans/Month)' },
          Basic: { header: 'Bronze(Tomans/Month)' },
          Standard: { header: 'Silver(Tomans/Month)' },
          Pro: { header: 'Gold(Tomans/Month)' },
        },
        flags,
      );
    } catch (err) {
      this.debug(err);
      this.error('There was a problem while getting plan info.');
    }
  }
}
