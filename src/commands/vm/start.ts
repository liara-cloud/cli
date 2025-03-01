import { Args, Flags } from '@oclif/core';
import Command, { IConfig } from '../../base.js';
import { IAAS_API_URL } from '../../constants.js';
import ora from 'ora';
import { createAction } from '../../utils/create-vm-actions.js';
import { promptVMs } from '../../utils/prompt-vms.js';
import { createDebugLogger } from '../../utils/output.js';

export default class VmStart extends Command {
  static flags = {
    ...Command.flags,
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
    detach: Flags.boolean({
      char: 'd',
      description: 'run command in detach mode',
    }),
  };
  static override description = 'start a vm';

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: IAAS_API_URL,
    });
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmStart);
    const debug = createDebugLogger(flags.debug);

    this.spinner = ora();

    await this.setGotConfig(flags);
    try {
      const vms = await this.getVms(
        'No vms found in the shutdown state.',
        (vm) => vm.power === 'POWERED_OFF' && vm.state !== 'DELETING',
      );

      const vm = flags.vm
        ? vms.find((vm) => vm.name === flags.vm) ||
          (() => {
            throw new Error('vm is not ruuning or does not exists.');
          })()
        : await promptVMs(vms);
      await createAction(vm._id, 'start', this.got);
      if (flags.detach) {
        this.spinner.succeed(
          `Start signal has been sent for vm "${vm.name}".Use "liara vm info" to view connection details.`,
        );
        return;
      }
      this.spinner.start(`vm "${vm.name}" is starting...`);
      const intervalID = setInterval(async () => {
        const operations = await this.getVMOperations(vm);

        const latestOperation = operations.sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        )[0];

        if (latestOperation.state === 'SUCCEEDED') {
          this.spinner.stop();

          this.spinner.succeed(
            `vm "${vm.name}" has been started.Use "liara vm info" to view connection details.'`,
          );

          clearInterval(intervalID);
        }
        if (latestOperation.state === 'FAILED') {
          this.spinner.fail(`Failed to start the vm "${vm.name}".`);
          clearInterval(intervalID);
        }
      }, 2000);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }

      if (error.response && error.response.statusCode === 404) {
        this.error(`Could not find the vm.`);
      }
      if (error.response && error.response.statusCode === 400) {
        this.error(`Invalid vm ID.`);
      }

      throw error;
    }
  }
}
