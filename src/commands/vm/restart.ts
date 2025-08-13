import { Args, Flags } from '@oclif/core';
import Command, { IConfig } from '../../base.js';
import { IAAS_API_URL } from '../../constants.js';
import ora from 'ora';
import { createAction } from '../../utils/create-vm-actions.js';
import { promptVMs } from '../../utils/prompt-vms.js';
import { createDebugLogger } from '../../utils/output.js';

export default class VmRestart extends Command {
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
  static override description = 'restart a vm';

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: IAAS_API_URL,
    });
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmRestart);
    const debug = createDebugLogger(flags.debug);

    this.spinner = ora();

    await this.setGotConfig(flags);
    try {
      const vms = await this.getVms(
        'No running vms were found.',
        (vm) => vm.state !== 'DELETING' && vm.power === 'POWERED_ON',
      );

      const vm = flags.vm
        ? vms.find((vm) => vm.name === flags.vm) ||
          (() => {
            this.error('vm is not running or does not exists.');
          })()
        : await promptVMs(vms);
      await createAction(vm._id, 'reboot', this.got);
      if (flags.detach) {
        this.spinner.succeed(
          `Restart signal has been sent for vm "${vm.name}"`,
        );
        return;
      }
      this.spinner.start(`vm "${vm.name}" is restarting...`);
      const intervalID = setInterval(async () => {
        const operations = await this.getVMOperations(vm);

        const latestOperation = operations.sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        )[0];

        if (latestOperation.state === 'SUCCEEDED') {
          this.spinner.stop();

          this.spinner.succeed(`vm "${vm.name}" has been restarted'`);

          clearInterval(intervalID);
        }
        if (latestOperation.state === 'FAILED') {
          this.spinner.fail(`Failed to restart the vm "${vm.name}".`);
          clearInterval(intervalID);
        }
      }, 2000);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }

      if (error.response && error.response.statusCode === 400) {
        this.error(`Invalid vm ID.`);
      }

      throw error;
    }
  }
}
