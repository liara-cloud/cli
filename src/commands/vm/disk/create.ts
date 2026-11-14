import { Flags } from '@oclif/core';
import inquirer from 'inquirer';

import VmCommand from '../../../vm-command.js';
import { createDebugLogger } from '../../../utils/output.js';
import { FROZEN_VM_MESSAGE } from '../../../utils/vm.js';

export default class VmDiskCreate extends VmCommand {
  static description = 'create an extra disk for a vm';

  static flags = {
    ...VmCommand.flags,
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
    size: Flags.integer({
      char: 's',
      description: 'disk size in GB',
      min: 1,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmDiskCreate);
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

      const size = flags.size ?? (await this.promptSize());

      await this.got.post(`vm/disk/${vm._id}`, { json: { size } });

      this.log(`A ${size} GB disk was created for vm "${vm.name}".`);
    } catch (error) {
      this.fail(error, debug, {
        400: 'Invalid vm ID or disk size.',
        404: 'Could not find the vm.',
        428: 'There is not enough space. Please upgrade the plan of the vm.',
      });
    }
  }

  async promptSize(): Promise<number> {
    const { size } = (await inquirer.prompt({
      name: 'size',
      type: 'number',
      message: 'Disk size (GB):',
      validate: (input) =>
        (Number.isInteger(input) && input >= 1) ||
        'The size must be a whole number of at least 1.',
    })) as { size: number };

    return size;
  }
}
