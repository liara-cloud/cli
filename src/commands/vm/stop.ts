import { Flags } from '@oclif/core';
import Command, { IConfig } from '../../base.js';
import { IGetVMResponse, IVMs } from '../../types/vm.js';
import { IAAS_API_URL } from '../../constants.js';
import { createDebugLogger } from '../../utils/output.js';
import ora from 'ora';
import { promptVMs } from '../../utils/prompt-vms.js';
import { createAction } from '../../utils/create-vm-actions.js';
export default class VmStop extends Command {
  static description = 'stop a VM';

  static flags = {
    ...Command.flags,
    vm: Flags.string({
      char: 'v',
      description: 'VM name',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'force the deletion',
    }),
    detach: Flags.boolean({
      char: 'd',
      description: 'run command in detach mode',
    }),
  };

  static aliases = ['vm:stop', 'vm:power:off', 'vm:shutdown'];

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: IAAS_API_URL,
    });
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmStop);
    const debug = createDebugLogger(flags.debug);
    this.spinner = ora();

    await this.setGotConfig(flags);

    try {
      const vm: IVMs = await this.getVm(flags.vm);

      if (flags.force) {
        await createAction(vm._id, 'stop', this.got);
      } else {
        await createAction(vm._id, 'shutdown', this.got);
      }
      if (flags.detach) {
        this.spinner.succeed(
          `${flags.force ? 'Stop' : 'Shutdown'} signal has been sent for VM "${vm.name}"`,
        );
        return;
      }

      this.spinner.start(`VM "${vm.name}" is shutting down/stopping...`);
      const intervalID = setInterval(async () => {
        const operations = await this.getVMOperations(vm);

        const latestOperation = operations.sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        )[0];

        if (latestOperation.state === 'SUCCEEDED') {
          this.spinner.stop();

          this.spinner.succeed(
            `VM "${vm.name}" has been ${flags.force ? 'stopped.' : 'shut down.'}`,
          );

          clearInterval(intervalID);
        }
        if (latestOperation.state === 'FAILED') {
          this.spinner.fail(`Failed to shutdown/stop the VM "${vm.name}".`);
          clearInterval(intervalID);
        }
      }, 2000);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }

      if (error.response && error.response.statusCode === 404) {
        this.error(`Could not find the VM.`);
      }
      if (error.response && error.response.statusCode === 400) {
        this.error(`Invalid VM ID.`);
      }

      throw error;
    }
  }

  async getVm(vmFlag: string | undefined) {
    this.spinner.start('Loading...');
    try {
      if (vmFlag) {
        const vms = await this.getVms(
          'VM does not exist.',
          (vm: IVMs) => vm.name === vmFlag,
        );
        this.spinner.stop();
        return vms[0];
      }

      const vms = await this.getVms(
        'No running VMs were found.',
        (vm: IVMs) => vm.state !== 'DELETING' && vm.power === 'POWERED_ON',
      );
      this.spinner.stop();
      const vm = await promptVMs(vms);
      return vm;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }
}
