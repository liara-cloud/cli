import { ux } from '@oclif/core';

import VmCommand from '../../../vm-command.js';
import { IGetVMInitScriptsResponse } from '../../../types/vm.js';
import { createDebugLogger } from '../../../utils/output.js';
import { formatDateTime } from '../../../utils/vm.js';

export default class VmScriptList extends VmCommand {
  static description =
    'list the init scripts that can run when a vm is created';

  static flags = {
    ...VmCommand.flags,
    ...ux.table.flags(),
  };

  static aliases = ['vm:script:ls'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmScriptList);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      this.spinner.start('Loading...');
      const { initScripts } =
        await this.got('init-scripts').json<IGetVMInitScriptsResponse>();
      this.spinner.stop();

      if (initScripts.length === 0) {
        this.log(
          'There are no init scripts. Create one using "liara vm script create".',
        );
        return;
      }

      ux.table(
        initScripts.map((script) => ({
          Name: script.name,
          Type: script.type,
          Description: script.description || '-',
          'Created At': formatDateTime(script.createdAt),
        })),
        { Name: {}, Type: {}, Description: {}, 'Created At': {} },
        flags,
      );
    } catch (error) {
      this.spinner.stop();
      this.fail(error, debug);
    }
  }
}
