import { Flags } from '@oclif/core';
import inquirer from 'inquirer';

import VmCommand from '../../vm-command.js';
import { IGetVMPlansResponse, IVMPlan } from '../../types/vm.js';
import { createDebugLogger } from '../../utils/output.js';
import {
  FROZEN_VM_MESSAGE,
  formatPlanChoice,
  getSelectablePlans,
} from '../../utils/vm.js';

export default class VmResize extends VmCommand {
  static description = 'change the plan of a vm (the vm must be powered off)';

  static flags = {
    ...VmCommand.flags,
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
    plan: Flags.string({
      char: 'p',
      description: 'the new plan (see "liara vm plans")',
    }),
  };

  static aliases = ['vm:change-plan'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmResize);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      const vm = await this.selectVm(flags.vm, {
        notFound: 'vm does not exist.',
        filter: (vm) => vm.state !== 'DELETING',
      });

      if (vm.state === 'FROZEN') {
        this.error(FROZEN_VM_MESSAGE);
      }

      const plan = await this.getPlan(vm.OS, vm.plan, flags.plan);

      await this.got.patch(`vm/resize/${vm._id}`, { json: { plan } });

      this.log(`The plan of vm "${vm.name}" changed to "${plan}".`);
    } catch (error) {
      this.fail(error, debug, {
        400: 'Invalid vm ID.',
        404: 'Could not find the vm.',
        409: 'Please power off the vm first, using "liara vm stop".',
        410: 'The plan of a free vm cannot be changed.',
        428: 'The disk usage of the vm is more than the new plan allows. Please reduce the extra space first.',
      });
    }
  }

  async getPlan(
    os: string,
    currentPlan: string,
    planFlag: string | undefined,
  ): Promise<string> {
    this.spinner.start('Loading...');
    let plans: { [key: string]: IVMPlan };
    try {
      ({ plans } = await this.got('plans').json<IGetVMPlansResponse>());
    } finally {
      this.spinner.stop();
    }

    const available = getSelectablePlans(plans, os);

    if (planFlag) {
      if (!available.includes(planFlag)) {
        this.error(
          `The plan "${planFlag}" is not available for this vm. Use "liara vm plans" to see the available plans.`,
        );
      }

      if (planFlag === currentPlan) {
        this.error(`The vm is already on the plan "${planFlag}".`);
      }

      return planFlag;
    }

    const { plan } = (await inquirer.prompt({
      name: 'plan',
      type: 'list',
      message: 'Please select the new plan:',
      choices: available.map((key) => ({
        value: key,
        name: `${formatPlanChoice(plans[key])}${key === currentPlan ? ' (current)' : ''}`,
      })),
    })) as { plan: string };

    if (plan === currentPlan) {
      this.error(`The vm is already on the plan "${plan}".`);
    }

    return plan;
  }
}
