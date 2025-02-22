import { Flags, ux } from '@oclif/core';
import Command, { IConfig } from '../../base.js';
import { IAAS_API_URL } from '../../constants.js';
import ora from 'ora';
import { IGetVMResponse, IVMs } from '../../types/vm.js';
import { promptVMs } from '../../utils/prompt-vms.js';
import { createDebugLogger } from '../../utils/output.js';
export default class Vminfo extends Command {
  static description = 'VM info';
  static aliases = ['vm:show', 'vm:inspect'];

  static flags = {
    ...Command.flags,
    ...ux.Table.table.flags(),
    vm: Flags.string({
      char: 'v',
      description: 'VM name',
    }),
  };

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: IAAS_API_URL,
    });
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Vminfo);
    const debug = createDebugLogger(flags.debug);
    await this.setGotConfig(flags);

    this.spinner = ora();

    try {
      const vm: IGetVMResponse = await this.getVm(flags.vm);
      ux.Table.table(
        [
          {
            Name: vm.name,
            State: vm.state,
            OS: vm.OS,
            Power: vm.power,
            Hostname: vm.config.hostname,
            Password: vm.config.rootPassword,
            IPs: vm.IPs.map((ip) => ip.address).join('\n'),
            CPU: vm.planDetails.CPU.amount + 'Cores',
            RAM: vm.planDetails.RAM.amount + 'GB',
            Volume: vm.planDetails.volume + 'GB',
          },
        ],
        {
          Name: {},
          State: {},
          OS: {},
          Power: {},
          Hostname: {},
          Password: {},
          IPs: {},
          CPU: {},
          RAM: {},
          Volume: {},
        },
        flags,
      );
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
        const vm = await this.got
          .get(`vm/${vms[0]._id}`)
          .json<IGetVMResponse>();
        this.spinner.stop();
        return vm;
      }

      const vms = await this.getVms(
        'No running VMs were found.',
        (vm: IVMs) => vm.state !== 'DELETING',
      );
      const selectedVm = await promptVMs(vms);
      const vm = await this.got
        .get(`vm/${selectedVm._id}`)
        .json<IGetVMResponse>();

      this.spinner.stop();
      return vm;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }
}
