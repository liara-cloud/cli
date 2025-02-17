import { Args, Flags } from '@oclif/core';
import Command, { IConfig } from '../../base.js';
import { IVMs } from '../../types/vm.js';
import { IAAS_API_URL } from '../../constants.js';
import ora from 'ora';
import { createAction } from '../../utils/create-vm-actions.js';
import { promptVMs } from '../../utils/prompt-vms.js';

export default class VmStart extends Command {
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
  static override description = 'power-on the VM';

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: IAAS_API_URL,
    });
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(VmStart);

    this.spinner = ora();

    await this.setGotConfig(flags);

    const vms = await this.getVms(
      'No VMs found in the shutdown state.',
      (vm) => vm.power === 'POWERED_OFF' && vm.state !== 'DELETING',
    );

    const vm = flags.vm
      ? vms.find((vm) => vm.name === flags.vm) ||
        (() => {
          throw new Error('VM is not ruuning or does not exists.');
        })()
      : await promptVMs(vms);
    await createAction(vm._id, 'start', this.got);
    if (flags.detach) {
      this.spinner.succeed(`Start signal has been sent for VM "${vm.name}"`);
      return;
    }
    this.spinner.start(`VM "${vm.name}" is starting...`);
    const intervalID = setInterval(async () => {
      const operations = await this.getVMOperations(vm);

      const latestOperation = operations.sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )[0];

      if (latestOperation.state === 'SUCCEEDED') {
        this.spinner.stop();

        this.spinner.succeed(`VM "${vm.name}" has been started'`);

        clearInterval(intervalID);
      }
      if (latestOperation.state === 'FAILED') {
        this.spinner.fail(`Failed to start the VM "${vm.name}".`);
        clearInterval(intervalID);
      }
    }, 2000);
  }
  async findOneVm(vms: IVMs[], vm: IVMs) {}
}
