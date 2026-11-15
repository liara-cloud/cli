import { Flags } from '@oclif/core';

import VmCommand from '../../../vm-command.js';
import { IGetVMInitScriptsResponse } from '../../../types/vm.js';
import { createDebugLogger } from '../../../utils/output.js';
import {
  describeScript,
  resolveScriptInput,
} from '../../../utils/vm-script.js';
import { INIT_SCRIPT_TYPES } from '../../../utils/vm.js';

export default class VmScriptUpdate extends VmCommand {
  static description = 'update an init script';

  static flags = {
    ...VmCommand.flags,
    script: Flags.string({
      char: 's',
      description: 'script name or id',
    }),
    name: Flags.string({
      char: 'n',
      description: 'new script name',
    }),
    description: Flags.string({
      description: 'new script description',
    }),
    type: Flags.string({
      char: 't',
      description: 'new script type',
      options: INIT_SCRIPT_TYPES,
    }),
    file: Flags.string({
      char: 'f',
      description: 'path of a .sh or .ps1 file to read the new script from',
    }),
    content: Flags.string({
      char: 'c',
      description: 'the new script',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmScriptUpdate);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      let input;
      try {
        input = await resolveScriptInput(flags);
      } catch (error) {
        this.error(error.message);
      }

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

      // The API replaces the whole script, so what is not changed is kept.
      let content = input.content;
      if (content === undefined) {
        content = await this.got(`init-scripts/${script._id}/download`).text();
      }

      await this.got.put(`init-scripts/${script._id}`, {
        json: {
          name: flags.name?.trim() || script.name,
          description:
            flags.description === undefined
              ? script.description
              : flags.description.trim() || undefined,
          type: input.type || script.type,
          content,
        },
      });

      this.log(`The script "${script.name}" has been updated.`);
    } catch (error) {
      this.spinner.stop();
      this.fail(error, debug, {
        400: 'The script is not valid.',
        404: 'Could not find the script.',
      });
    }
  }
}
