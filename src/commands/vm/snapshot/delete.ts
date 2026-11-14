import { Flags } from '@oclif/core';

import VmCommand from '../../../vm-command.js';
import { IGetVMSnapshotsResponse } from '../../../types/vm.js';
import { createDebugLogger } from '../../../utils/output.js';
import {
  SNAPSHOT_OPERATIONS,
  describeSnapshot,
} from '../../../utils/vm-disk-snapshot.js';
import { FROZEN_VM_MESSAGE } from '../../../utils/vm.js';

export default class VmSnapshotDelete extends VmCommand {
  static description = 'delete a snapshot of a vm';

  static flags = {
    ...VmCommand.flags,
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
    snapshot: Flags.string({
      char: 's',
      description: 'snapshot name or id',
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

  static aliases = ['vm:snapshot:rm'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmSnapshotDelete);
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

      const snapshots = await this.got(
        `vm/snapshot/${vm._id}`,
      ).json<IGetVMSnapshotsResponse>();

      if (snapshots.length === 0) {
        this.error(`vm "${vm.name}" has no snapshots.`);
      }

      const snapshot = await this.selectItem(snapshots, flags.snapshot, {
        label: 'snapshot',
        describe: describeSnapshot,
      });

      if (
        !flags.force &&
        !(await this.confirm(
          `Are you sure you want to delete the snapshot "${snapshot.name}"?`,
        ))
      ) {
        return;
      }

      const after = flags.detach
        ? undefined
        : await this.getLatestOperationTime(vm);

      await this.got.post(`vm/delete-snapshot/${vm._id}`, {
        json: { snapshotID: snapshot._id },
      });

      if (flags.detach) {
        this.spinner.succeed(
          `The delete request has been submitted for the snapshot "${snapshot.name}". Use "liara vm events" to follow it.`,
        );
        return;
      }

      await this.followOperation(
        vm,
        after,
        {
          doing: `deleting the snapshot "${snapshot.name}"...`,
          succeeded: `The snapshot "${snapshot.name}" has been deleted.`,
          failed: `Failed to delete the snapshot "${snapshot.name}".`,
        },
        SNAPSHOT_OPERATIONS.delete,
      );
    } catch (error) {
      this.spinner.stop();
      this.fail(error, debug, {
        400: 'Invalid vm ID or snapshot ID.',
        404: 'Could not find the snapshot.',
      });
    }
  }
}
