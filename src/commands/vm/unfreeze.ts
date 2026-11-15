import { Flags } from '@oclif/core';

import VmCommand from '../../vm-command.js';
import { createDebugLogger } from '../../utils/output.js';

export default class VmUnfreeze extends VmCommand {
  static description = 'unfreeze a frozen vm';

  static flags = {
    ...VmCommand.flags,
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmUnfreeze);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      const vm = await this.selectVm(flags.vm, {
        notFound: 'No frozen vms found.',
        filter: (vm) => vm.state === 'FROZEN',
      });

      await this.got.post(`vm/unfreeze/${vm._id}`);

      this.log(
        `vm "${vm.name}" is being activated. Use "liara vm list" to follow its state.`,
      );
    } catch (error) {
      this.fail(error, debug, {
        400: 'Invalid vm ID.',
        402: 'Your credit is not enough. You need at least the usage of the next hour.',
        404: 'Could not find the vm.',
      });
    }
  }
}
