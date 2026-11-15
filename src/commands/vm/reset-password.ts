import { Flags } from '@oclif/core';

import VmCommand from '../../vm-command.js';
import { IVMResetPasswordResponse } from '../../types/vm.js';
import { createDebugLogger } from '../../utils/output.js';
import { FROZEN_VM_MESSAGE, getRootUsername } from '../../utils/vm.js';

export default class VmResetPassword extends VmCommand {
  static description =
    'reset the root (or Administrator) password of a vm (the vm must be powered off)';

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
  };

  static aliases = ['vm:reset:password'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmResetPassword);
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

      const username = getRootUsername(vm.OS);

      if (
        !flags.force &&
        !(await this.confirm(
          `The ${username} password of "${vm.name}" will be reset and the vm will start again. Continue?`,
        ))
      ) {
        return;
      }

      const { password } = await this.got
        .post(`vm/reset-password/${vm._id}`)
        .json<IVMResetPasswordResponse>();

      this.log(`The ${username} password of vm "${vm.name}" was reset.`);
      this.log(`New password: ${password}`);
    } catch (error) {
      this.fail(error, debug, {
        400: 'Invalid vm ID.',
        404: 'Could not find the vm.',
        409: 'Please power off the vm first, using "liara vm stop".',
      });
    }
  }
}
