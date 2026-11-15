import { Flags } from '@oclif/core';

import VmCommand from '../../../vm-command.js';
import { createDebugLogger } from '../../../utils/output.js';
import { resolveScriptInput } from '../../../utils/vm-script.js';
import { INIT_SCRIPT_TYPES } from '../../../utils/vm.js';

export default class VmScriptCreate extends VmCommand {
  static description = 'create an init script for vms';

  static flags = {
    ...VmCommand.flags,
    name: Flags.string({
      char: 'n',
      description: 'script name',
    }),
    description: Flags.string({
      description: 'script description',
    }),
    type: Flags.string({
      char: 't',
      description:
        'script type (defaults to the type of --file, or shell for --content)',
      options: INIT_SCRIPT_TYPES,
    }),
    file: Flags.string({
      char: 'f',
      description: 'path of a .sh or .ps1 file to read the script from',
    }),
    content: Flags.string({
      char: 'c',
      description: 'the script itself',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmScriptCreate);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      let script;
      try {
        script = await resolveScriptInput(flags);
      } catch (error) {
        this.error(error.message);
      }

      if (script.content === undefined) {
        this.error('Please provide the script using --file or --content.');
      }

      const type = script.type || 'shell';

      await this.got.post('init-scripts', {
        json: {
          name: flags.name?.trim() || undefined,
          description: flags.description?.trim() || undefined,
          type,
          content: script.content,
        },
      });

      this.log(
        `The ${type} script${flags.name ? ` "${flags.name}"` : ''} has been created.`,
      );
    } catch (error) {
      this.fail(error, debug, {
        400: `The script is not valid.`,
      });
    }
  }
}
