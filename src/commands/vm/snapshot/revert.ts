import { Flags } from '@oclif/core';

import VmCommand from '../../../vm-command.js';
import { IGetVMSnapshotsResponse } from '../../../types/vm.js';
import { createDebugLogger } from '../../../utils/output.js';
import {
  SNAPSHOT_OPERATIONS,
  describeSnapshot,
} from '../../../utils/vm-disk-snapshot.js';
import { FROZEN_VM_MESSAGE } from '../../../utils/vm.js';

export default class VmSnapshotRevert extends VmCommand {
  static description =
    'revert a vm to one of its snapshots (the current data of the vm is replaced)';

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

  static aliases = ['vm:snapshot:restore'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmSnapshotRevert);
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
          `The current data of "${vm.name}" will be replaced with the snapshot "${snapshot.name}". Continue?`,
        ))
      ) {
        return;
      }

      const after = flags.detach
        ? undefined
        : await this.getLatestOperationTime(vm);

      await this.got.post(`vm/revert-snapshot/${vm._id}`, {
        json: { snapshotID: snapshot._id },
      });

      if (flags.detach) {
        this.spinner.succeed(
          `The revert request has been submitted for the snapshot "${snapshot.name}". Use "liara vm events" to follow it.`,
        );
        return;
      }

      await this.followOperation(
        vm,
        after,
        {
          doing: `reverting vm "${vm.name}" to the snapshot "${snapshot.name}"...`,
          succeeded: `vm "${vm.name}" has been reverted to the snapshot "${snapshot.name}".`,
          failed: `Failed to revert vm "${vm.name}" to the snapshot "${snapshot.name}".`,
        },
        SNAPSHOT_OPERATIONS.revert,
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
