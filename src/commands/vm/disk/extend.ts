import { Flags } from '@oclif/core';
import inquirer from 'inquirer';

import VmCommand from '../../../vm-command.js';
import { IGetVMDisksResponse } from '../../../types/vm.js';
import { createDebugLogger } from '../../../utils/output.js';
import { describeDisk } from '../../../utils/vm-disk-snapshot.js';
import { FROZEN_VM_MESSAGE } from '../../../utils/vm.js';

export default class VmDiskExtend extends VmCommand {
  static description =
    'increase the size of a vm disk (the vm must be powered off)';

  static flags = {
    ...VmCommand.flags,
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
    disk: Flags.string({
      description: 'disk name or id',
    }),
    size: Flags.integer({
      char: 's',
      description: 'the new size of the disk in GB',
      min: 1,
    }),
  };

  static aliases = ['vm:disk:resize'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmDiskExtend);
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

      const { disks } = await this.got(
        `vm/disk/${vm._id}`,
      ).json<IGetVMDisksResponse>();

      if (disks.length === 0) {
        this.error(`vm "${vm.name}" has no extra disks.`);
      }

      const disk = await this.selectItem(disks, flags.disk, {
        label: 'disk',
        describe: describeDisk,
      });

      const size = flags.size ?? (await this.promptSize(disk.size));

      if (size <= disk.size) {
        this.error(
          `The new size must be more than the current size of the disk (${disk.size} GB).`,
        );
      }

      await this.got.post(`vm/disk/${vm._id}/${disk._id}`, {
        json: { newSize: size },
      });

      this.log(
        `The size of disk "${disk.name}" is being increased to ${size} GB. Use "liara vm events" to follow it.`,
      );
    } catch (error) {
      this.fail(error, debug, {
        400: 'Invalid vm ID or disk size.',
        404: 'Could not find the disk.',
        409: 'Please power off the vm first, using "liara vm stop".',
        428: 'There is not enough space to extend the disk. Please upgrade the plan of the vm.',
      });
    }
  }

  async promptSize(current: number): Promise<number> {
    const { size } = (await inquirer.prompt({
      name: 'size',
      type: 'number',
      message: `New disk size (GB, currently ${current}):`,
      validate: (input) =>
        (Number.isInteger(input) && input > current) ||
        `The size must be a whole number more than ${current}.`,
    })) as { size: number };

    return size;
  }
}
