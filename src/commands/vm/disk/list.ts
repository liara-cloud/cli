import { Flags, ux } from '@oclif/core';

import VmCommand from '../../../vm-command.js';
import { IGetVMDisksResponse } from '../../../types/vm.js';
import { createDebugLogger } from '../../../utils/output.js';
import { formatDateTime } from '../../../utils/vm.js';

export default class VmDiskList extends VmCommand {
  static description = 'list the disks of a vm';

  static flags = {
    ...VmCommand.flags,
    ...ux.table.flags(),
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
  };

  static aliases = ['vm:disk:ls'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmDiskList);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      const vm = await this.selectVm(flags.vm, {
        notFound: 'vm does not exist.',
        filter: (vm) => vm.state !== 'DELETING',
      });

      const { disks } = await this.got(
        `vm/disk/${vm._id}`,
      ).json<IGetVMDisksResponse>();

      if (disks.length === 0) {
        this.log(`vm "${vm.name}" has no extra disks.`);
        return;
      }

      ux.table(
        disks.map((disk) => ({
          Name: disk.name,
          'Size(GB)': disk.size,
          'Created At': formatDateTime(disk.createdAt),
        })),
        { Name: {}, 'Size(GB)': {}, 'Created At': {} },
        flags,
      );
    } catch (error) {
      this.fail(error, debug, {
        400: 'Invalid vm ID.',
        404: 'Could not find the vm.',
      });
    }
  }
}
