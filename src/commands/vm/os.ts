import { ux } from '@oclif/core';

import VmCommand from '../../vm-command.js';
import { IGETOperatingSystemsResponse } from '../../types/vm.js';
import { createDebugLogger } from '../../utils/output.js';

export default class VmOs extends VmCommand {
  static description =
    'list the operating systems and one-click apps available for vms';

  static flags = {
    ...VmCommand.flags,
    ...ux.table.flags(),
  };

  static aliases = ['vm:oss', 'vm:images'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmOs);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      this.spinner.start('Loading...');
      const oss = await this.got('oss').json<IGETOperatingSystemsResponse>();
      this.spinner.stop();

      const { 'one-click-apps': apps, ...systems } = oss;
      const rows = [
        ...Object.entries(systems as { [key: string]: string[] }).map(
          ([name, versions]) => ({
            Name: name,
            Type: 'OS',
            Versions: versions.join(', '),
          }),
        ),
        ...Object.entries(apps || {}).map(([name, versions]) => ({
          Name: name,
          Type: 'App',
          Versions: versions.join(', '),
        })),
      ];

      ux.table(rows, { Name: {}, Type: {}, Versions: {} }, flags);
    } catch (error) {
      this.spinner.stop();
      this.fail(error, debug);
    }
  }
}
