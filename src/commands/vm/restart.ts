import { Args, Flags } from '@oclif/core';
import Command, { IConfig } from '../../base.js';
import { IAAS_API_URL } from '../../constants.js';
import ora from 'ora';
import { createAction } from '../../utils/create-vm-actions.js';
import { promptVMs } from '../../utils/prompt-vms.js';

export default class VmRestart extends Command {
  static flags = {
    ...Command.flags,
    vm: Flags.string({
      char: 'v',
      description: 'VM name',
    }),
    detach: Flags.boolean({
      char: 'd',
      description: 'run command in detach mode',
    }),
  };
  static override description = 'Restart the VM';

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: IAAS_API_URL,
    });
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmRestart);

    this.spinner = ora();

    await this.setGotConfig(flags);

    const vms = await this.getVms(
      'No running VMs were found.',
      (vm) => vm.state !== 'DELETING' && vm.power === 'POWERED_ON',
    );

    const vm = flags.vm
      ? vms.find((vm) => vm.name === flags.vm) ||
        (() => {
          throw new Error('VM is not ruuning or does not exists.');
        })()
      : await promptVMs(vms);
    await createAction(vm._id, 'reboot', this.got);
    if (flags.detach) {
      this.spinner.succeed(`Restart signal has been sent for VM "${vm.name}"`);
      return;
    }
    this.spinner.start(`VM "${vm.name}" is restarting...`);
    const intervalID = setInterval(async () => {
      const operations = await this.getVMOperations(vm);

      const latestOperation = operations.sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )[0];

      if (latestOperation.state === 'SUCCEEDED') {
        this.spinner.stop();

        this.spinner.succeed(`VM "${vm.name}" has been restarted'`);

        clearInterval(intervalID);
      }
      if (latestOperation.state === 'FAILED') {
        this.spinner.fail(`Failed to restart the VM "${vm.name}".`);
        clearInterval(intervalID);
      }
    }, 2000);
  }
}
