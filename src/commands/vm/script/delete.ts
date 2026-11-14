import { Flags } from '@oclif/core';

import VmCommand from '../../../vm-command.js';
import { IGetVMInitScriptsResponse } from '../../../types/vm.js';
import { createDebugLogger } from '../../../utils/output.js';
import { describeScript } from '../../../utils/vm-script.js';

export default class VmScriptDelete extends VmCommand {
  static description = 'delete an init script';

  static flags = {
    ...VmCommand.flags,
    script: Flags.string({
      char: 's',
      description: 'script name or id',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'skip the confirmation',
    }),
  };

  static aliases = ['vm:script:rm'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmScriptDelete);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      this.spinner.start('Loading...');
      const { initScripts } =
        await this.got('init-scripts').json<IGetVMInitScriptsResponse>();
      this.spinner.stop();

      if (initScripts.length === 0) {
        this.error('There are no init scripts.');
      }

      const script = await this.selectItem(initScripts, flags.script, {
        label: 'script',
        describe: describeScript,
      });

      if (
        !flags.force &&
        !(await this.confirm(
          `Are you sure you want to delete the script "${script.name}"? It can no longer be selected when creating a vm.`,
        ))
      ) {
        return;
      }

      await this.got.delete(`init-scripts/${script._id}`);

      this.log(`The script "${script.name}" has been deleted.`);
    } catch (error) {
      this.spinner.stop();
      this.fail(error, debug, {
        404: 'Could not find the script.',
      });
    }
  }
}
