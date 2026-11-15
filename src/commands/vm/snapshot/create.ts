import { Flags } from '@oclif/core';
import inquirer from 'inquirer';

import VmCommand from '../../../vm-command.js';
import { createDebugLogger } from '../../../utils/output.js';
import { SNAPSHOT_OPERATIONS } from '../../../utils/vm-disk-snapshot.js';
import { FROZEN_VM_MESSAGE } from '../../../utils/vm.js';

export default class VmSnapshotCreate extends VmCommand {
  static description =
    'create a snapshot of a vm (the snapshot contains the disk, not the RAM)';

  static flags = {
    ...VmCommand.flags,
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
    name: Flags.string({
      char: 'n',
      description: 'snapshot name',
    }),
    description: Flags.string({
      description: 'snapshot description',
    }),
    detach: Flags.boolean({
      char: 'd',
      description: 'run command in detach mode',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmSnapshotCreate);
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

      const name = flags.name ?? (await this.promptName());
      if (!name.trim()) {
        this.error('The snapshot name cannot be empty.');
      }

      const description = flags.description?.trim() || undefined;
      const after = flags.detach
        ? undefined
        : await this.getLatestOperationTime(vm);

      await this.got.post(`vm/take-snapshot/${vm._id}`, {
        json: { name: name.trim(), description },
      });

      if (flags.detach) {
        this.spinner.succeed(
          `The snapshot request has been submitted for vm "${vm.name}". Use "liara vm events" to follow it.`,
        );
        return;
      }

      await this.followOperation(
        vm,
        after,
        {
          doing: `creating the snapshot "${name}"...`,
          succeeded: `The snapshot "${name}" has been created.`,
          failed: `Failed to create the snapshot "${name}".`,
        },
        SNAPSHOT_OPERATIONS.create,
      );
    } catch (error) {
      this.spinner.stop();
      this.fail(error, debug, {
        400: 'Invalid vm ID or snapshot data.',
        404: 'Could not find the vm.',
      });
    }
  }

  async promptName(): Promise<string> {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Snapshot name:',
      validate: (input) => input.trim().length > 0,
    })) as { name: string };

    return name;
  }
}
