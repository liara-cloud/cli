import { Flags } from '@oclif/core';

import VmCommand from '../../../vm-command.js';
import {
  VM_IPV4_HOURLY_PRICE,
  VM_IPV4_MONTHLY_PRICE,
} from '../../../constants.js';
import { createDebugLogger } from '../../../utils/output.js';
import { FROZEN_VM_MESSAGE } from '../../../utils/vm.js';

export default class VmIpAdd extends VmCommand {
  static description = 'add an extra IPv4 address to a vm';

  static flags = {
    ...VmCommand.flags,
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'skip the confirmation',
    }),
    detach: Flags.boolean({
      char: 'd',
      description: 'run command in detach mode',
    }),
  };

  static aliases = ['vm:ip:create'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmIpAdd);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      const selected = await this.selectVm(flags.vm, {
        notFound: 'vm does not exist.',
        filter: (vm) => vm.state !== 'DELETING',
      });

      if (selected.state === 'FROZEN') {
        this.error(FROZEN_VM_MESSAGE);
      }

      const vm = await this.getVmDetails(selected);
      const ipCount = vm.IPs.length;
      const monthly =
        vm.planDetails?.IPv4MonthlyPrice?.[ipCount] ?? VM_IPV4_MONTHLY_PRICE;
      const hourly =
        vm.planDetails?.IPv4HourlyPrice?.[ipCount] ?? VM_IPV4_HOURLY_PRICE;

      if (
        !flags.force &&
        !(await this.confirm(
          `An extra IPv4 address costs ${hourly.toLocaleString()} Tomans/Hour (${monthly.toLocaleString()} Tomans/Month). Add it to "${vm.name}"?`,
        ))
      ) {
        return;
      }

      await this.got.post(`vm/extra-ip/${vm._id}`);

      if (flags.detach) {
        this.spinner.succeed(
          `The request has been submitted. The IP will be assigned to vm "${vm.name}" shortly. Use "liara vm info" to see it.`,
        );
        return;
      }

      this.spinner.start(`assigning an IP to vm "${vm.name}"...`);
      const details = await this.waitForVm(
        vm,
        (current) => current.IPs.length > ipCount,
      );

      if (!details) {
        this.spinner.warn(
          'The IP is not assigned yet. Use "liara vm info" to check it later.',
        );
        return;
      }

      const added = details.IPs[details.IPs.length - 1];
      this.spinner.succeed(
        `The IP ${added.address} has been assigned to vm "${vm.name}".`,
      );
      this.log(
        'To make the new IP reachable, power off the vm and run "liara vm reset-network".',
      );
    } catch (error) {
      this.spinner.stop();
      this.fail(error, debug, {
        400: 'Invalid vm ID.',
        403: 'This vm has reached the maximum number of IPs.',
        404: 'Could not find the vm.',
        429: 'An IP request is still in progress. Please wait until it finishes.',
        503: 'There is no assignable IP right now. Please try again in a few hours.',
      });
    }
  }
}
