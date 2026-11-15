import { Flags, ux } from '@oclif/core';

import VmCommand from '../../../vm-command.js';
import { IGetVMSnapshotsResponse } from '../../../types/vm.js';
import { createDebugLogger } from '../../../utils/output.js';
import { formatBytes, formatDateTime } from '../../../utils/vm.js';

export default class VmSnapshotList extends VmCommand {
  static description = 'list the snapshots of a vm';

  static flags = {
    ...VmCommand.flags,
    ...ux.table.flags(),
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
  };

  static aliases = ['vm:snapshot:ls'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmSnapshotList);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      const vm = await this.selectVm(flags.vm, {
        notFound: 'vm does not exist.',
        filter: (vm) => vm.state !== 'DELETING',
      });

      const snapshots = await this.got(
        `vm/snapshot/${vm._id}`,
      ).json<IGetVMSnapshotsResponse>();

      if (snapshots.length === 0) {
        this.log(`vm "${vm.name}" has no snapshots.`);
        return;
      }

      ux.table(
        snapshots.map((snapshot) => ({
          Name: snapshot.name,
          Description: snapshot.description || '-',
          Size: formatBytes(snapshot.sizeB),
          Current: snapshot.isCurrent ? 'yes' : '',
          'Created At': formatDateTime(snapshot.createdAt),
        })),
        {
          Name: {},
          Description: {},
          Size: {},
          Current: {},
          'Created At': {},
        },
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
