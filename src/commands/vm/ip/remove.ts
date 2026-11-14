import { Flags } from '@oclif/core';

import VmCommand from '../../../vm-command.js';
import { createDebugLogger } from '../../../utils/output.js';
import { FROZEN_VM_MESSAGE } from '../../../utils/vm.js';

export default class VmIpRemove extends VmCommand {
  static description = 'remove the extra IPv4 address of a vm';

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

  static aliases = ['vm:ip:delete', 'vm:ip:rm'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmIpRemove);
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

      if (ipCount < 2) {
        this.error('This vm has no extra IP.');
      }

      const extraIp = vm.IPs[ipCount - 1];

      if (
        !flags.force &&
        !(await this.confirm(
          `Services that use ${extraIp.address} will no longer be reachable and you may not get the same IP again. Remove it from "${vm.name}"?`,
        ))
      ) {
        return;
      }

      await this.got.delete(`vm/extra-ip/${vm._id}`);

      if (flags.detach) {
        this.spinner.succeed(
          `The request has been submitted. The IP ${extraIp.address} will be removed from vm "${vm.name}" shortly.`,
        );
        return;
      }

      this.spinner.start(`removing ${extraIp.address} from vm "${vm.name}"...`);
      const details = await this.waitForVm(
        vm,
        (current) => current.IPs.length < ipCount,
      );

      if (details) {
        this.spinner.succeed(
          `The IP ${extraIp.address} has been removed from vm "${vm.name}".`,
        );
      } else {
        this.spinner.warn(
          'The IP is not removed yet. Use "liara vm info" to check it later.',
        );
      }
    } catch (error) {
      this.spinner.stop();
      this.fail(error, debug, {
        400: 'Invalid vm ID.',
        403: 'This vm has no extra IP.',
        404: 'Could not find the vm.',
        429: 'An IP request is still in progress. Please wait until it finishes.',
      });
    }
  }
}
