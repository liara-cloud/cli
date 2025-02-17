import { Flags } from '@oclif/core';
import { IVMs } from '../../types/vm.js';
import Command, { IConfig } from '../../base.js';
import { IAAS_API_URL } from '../../constants.js';
import inquirer from 'inquirer';
import { createDebugLogger } from '../../utils/output.js';
import ora from 'ora';
import { promptVMs } from '../../utils/prompt-vms.js';

export default class VmDelete extends Command {
  static description = 'delete a vm';

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
    this.spinner = ora();

    await this.setGotConfig(flags);

    const vm = await this.getVm(flags.vm);

    try {
      if (flags.force) {
        await this.got.delete(`vm/${vm._id}`);
      } else if (await this.confirm(vm)) {
        await this.got.delete(`vm/${vm._id}`);
      }
      this.log(`VM "${vm.name}" deleted.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
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
          (vm: IVMs) => vm.name === vmFlag && vm.state !== 'DELETING',
        );
        this.spinner.stop();
        return vms[0];
      }

      const vms = await this.getVms(
        'Please go to https://console.liara.ir/vms or use liara vm create command and create an VM, first.',
        (vm: IVMs) => vm.state !== 'DELETING',
      );
      this.spinner.stop();
      const vm = await promptVMs(vms);
      return vm;
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
