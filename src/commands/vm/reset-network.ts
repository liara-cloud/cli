import { Flags } from '@oclif/core';

import VmCommand from '../../vm-command.js';
import { createDebugLogger } from '../../utils/output.js';
import { FROZEN_VM_MESSAGE, isWindowsOS } from '../../utils/vm.js';

export default class VmResetNetwork extends VmCommand {
  static description =
    'reset the network settings of a vm (the vm must be powered off)';

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

  static aliases = ['vm:reset:network'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmResetNetwork);
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

      if (isWindowsOS(vm.OS)) {
        this.error('Resetting the network of a Windows vm is not supported.');
      }

      if (
        !flags.force &&
        !(await this.confirm(
          `The network settings of "${vm.name}" will be reset to their defaults. Continue?`,
        ))
      ) {
        return;
      }

      const after = flags.detach
        ? undefined
        : await this.getLatestOperationTime(vm);

      await this.got.post(`vm/reset-network/${vm._id}`);

      if (flags.detach) {
        this.spinner.succeed(
          `Network reset request submitted for vm "${vm.name}". Use "liara vm events" to follow it.`,
        );
        return;
      }

      await this.followOperation(vm, after, {
        doing: `resetting the network of vm "${vm.name}"...`,
        succeeded: `The network of vm "${vm.name}" has been reset.`,
        failed: `Failed to reset the network of vm "${vm.name}".`,
      });
    } catch (error) {
      this.spinner.stop();
      this.fail(error, debug, {
        400: 'Resetting the network of a Windows vm is not supported.',
        404: 'Could not find the vm.',
        409: 'Please power off the vm first, using "liara vm stop".',
      });
    }
  }
}
