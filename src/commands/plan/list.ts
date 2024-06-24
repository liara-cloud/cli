import { ux } from '@oclif/core';
import Command from '../../base.js';
import spacing from '../../utils/spacing.js';

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
            (plan === 'free' || plan.includes('g2')) &&
            plans.projects[plan].available &&
            plans.projects[plan].region === 'iran',
        )
        .map((plan) => {
          const Plan = plan;
          const BundlePlan = plans.projectBundlePlans[plan];
          const BundlePlanDetails = Object.keys(BundlePlan).map((key) => {
            const { displayPrice } = BundlePlan[key];
            return { key, displayPrice };
          });

          const Free = BundlePlanDetails[0].displayPrice.toLocaleString();
          const Standard = BundlePlanDetails[1].displayPrice.toLocaleString();
          const Pro = BundlePlanDetails[2].displayPrice.toLocaleString();

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
            Free,
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
          Free: { header: 'Bronze' },
          Standard: { header: 'Silver(Tomans)' },
          Pro: { header: 'Gold(Tomans)' },
        },
        flags,
      );
    } catch (error) {
      this.debug(error);
      this.error('There was a problem while getting plan info.');
    }
  }
}
