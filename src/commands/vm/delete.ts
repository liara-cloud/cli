import { Args, Flags } from '@oclif/core';
import Command, {
  IConfig,
  IGetVMResponse,
  IGetVMsResponse,
  IVMs,
} from '../../base.js';
import { IAAS_API_URL } from '../../constants.js';
import inquirer from 'inquirer';
import { createDebugLogger } from '../../utils/output.js';
import ora from 'ora';

export default class VmDelete extends Command {
  static description = 'delete a vm';

  static flags = {
    ...Command.flags,
    vm: Flags.string({
      char: 'v',
      description: 'vm id',
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'force the deletion',
    }),
  };

  static aliases = ['vm:delete', 'vm:rm'];

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: IAAS_API_URL,
    });
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmDelete);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);

    const vm = await this.getVm(flags.vm);

    try {
      if (flags.force) {
        await this.got.delete(`vm/${vm._id}`);
        this.log(`Vm ${vm.name} deleted.`);
      } else if (await this.confirm(vm)) {
        await this.got.delete(`vm/${vm._id}`);
        this.log(`Vm ${vm.name} deleted.`);
      }
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }

      if (error.response && error.response.statusCode === 404) {
        this.error(`Could not find the vm.`);
      }

      this.error(`Could not delete the vm. Please try again.`);
    }
  }

  async getVm(vmFlag: string | undefined) {
    if (vmFlag) {
      try {
        const vm = await this.got(`vm/${vmFlag}`).json<IGetVMResponse>();

        if (vm.state === 'DELETING') {
          this.error(`Could not find the VM.`);
        }
        return vm;
      } catch (error) {
        if (error.response && error.response.statusCode === 400) {
          this.error(`Invalid vm ID.`);
        }
        if (error.response && error.response.statusCode === 404) {
          this.error(`Could not find the vm.`);
        }
      }
    }

    return await this.promptVMs();
  }

  async promptVMs() {
    this.spinner = ora();
    this.spinner.start('Loading...');
    try {
      const allVms = await this.got('vm').json<IGetVMsResponse>();
      const vms = allVms.vms.filter((vm) => vm.state !== 'DELETING');
      this.spinner.stop();

      if (!vms.length) {
        this.error(
          'Please go to https://console.liara.ir/vms and create an vm or use liara vm create command, first.',
        );
      }

      const { selectedVm } = (await inquirer.prompt({
        name: 'selectedVm',
        type: 'list',
        message: 'Please select a vm:',
        choices: [...vms.map((vm) => ({ name: vm.name, value: vm._id }))],
      })) as { selectedVm: string };

      return vms.filter((vm) => vm._id == selectedVm)[0];
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async confirm(vm: IVMs) {
    const { confirmation } = (await inquirer.prompt({
      name: 'confirmation',
      type: 'confirm',
      message: `Are you sure you want to delete "${vm.name}"?`,
      default: false,
    })) as { confirmation: boolean };

    return confirmation;
  }
}
