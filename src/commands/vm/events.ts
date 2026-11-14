import { Flags, ux } from '@oclif/core';

import VmCommand from '../../vm-command.js';
import { createDebugLogger } from '../../utils/output.js';
import { formatDateTime } from '../../utils/vm.js';

export default class VmEvents extends VmCommand {
  static description = 'list the operations (events) of a vm';

  static flags = {
    ...VmCommand.flags,
    ...ux.table.flags(),
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
  };

  static aliases = ['vm:operations'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmEvents);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      const vm = await this.selectVm(flags.vm, {
        notFound: 'vm does not exist.',
        filter: (vm) => vm.state !== 'DELETING',
      });

      const operations = await this.getVMOperations(vm);

      if (operations.length === 0) {
        this.log(`There are no events for vm "${vm.name}".`);
        return;
      }

      ux.table(
        [...operations]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((operation) => ({
            Name: operation.name,
            State: operation.state,
            'Created At': formatDateTime(operation.createdAt),
          })),
        {
          Name: {},
          State: {},
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
