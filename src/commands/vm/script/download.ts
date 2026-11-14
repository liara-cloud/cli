import { Flags } from '@oclif/core';
import fs from 'fs-extra';

import VmCommand from '../../../vm-command.js';
import { IGetVMInitScriptsResponse } from '../../../types/vm.js';
import { createDebugLogger } from '../../../utils/output.js';
import { describeScript } from '../../../utils/vm-script.js';

export default class VmScriptDownload extends VmCommand {
  static description = 'print an init script, or save it to a file';

  static flags = {
    ...VmCommand.flags,
    script: Flags.string({
      char: 's',
      description: 'script name or id',
    }),
    output: Flags.string({
      char: 'o',
      description: 'save the script to this file instead of printing it',
    }),
  };

  static aliases = ['vm:script:get'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmScriptDownload);
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

      const content = await this.got(
        `init-scripts/${script._id}/download`,
      ).text();

      if (flags.output) {
        await fs.outputFile(flags.output, content);
        this.log(`The script "${script.name}" was saved to ${flags.output}.`);
        return;
      }

      this.log(content);
    } catch (error) {
      this.spinner.stop();
      this.fail(error, debug, {
        404: 'Could not find the script.',
      });
    }
  }
}
