import ora, { Ora } from 'ora';
import inquirer from 'inquirer';
import { Flags } from '@oclif/core';

import Command, { IConfig } from '../../base.js';
import { IAAS_API_URL } from '../../constants.js';
import { IGETOperatingSystems, IGetVMsResponse, IVMs } from '../../types/vm.js';
import checkRegexPattern, {
  checkVMNameRegexPattern,
} from '../../utils/name-regex.js';
import { createDebugLogger } from '../../utils/output.js';

export default class VmCreate extends Command {
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

  static description = 'create a vm';

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: IAAS_API_URL,
    });
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmCreate);
    const debug = createDebugLogger(flags.debug);

    this.spinner = ora();
    await this.setGotConfig(flags);

    try {
      const oss = await this.getOperatingSystems();

      const vmName = await this.promptVMName();

      const osName = await this.promptOperatingSystems(oss);

      const osVersion = await this.promptOperatingSystemVersions(osName, oss);

      const plan = await this.promptPlan();

      const SSHKeys = await this.promptSSHKey();

      const newSSH =
        SSHKeys.length > 0
          ? {
              config: {
                SSHKeys: SSHKeys,
              },
            }
          : null;
      const newVM = {
        OS: `${osName}-${osVersion}`,
        name: vmName,
        plan,
        ...newSSH,
      };
      await this.got.post('vm', {
        json: newVM,
      });
      if (flags.detach) {
        this.spinner.succeed(
          `vm "${vmName}" created successfully in detach mode.`,
        );
        return;
      }
      this.spinner.start(`creating vm "${vmName}"...`);
      const intervalID = setInterval(async () => {
        const vmState = await this.getVmState(vmName);

        if (vmState === 'CREATED') {
          this.spinner.succeed(`vm "${vmName}" is created successfully.`);
          clearInterval(intervalID);
        }
      }, 2000);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.data) {
        debug(JSON.stringify(error.response.data));
      }
      if (error.response && error.response.statusCode === 409) {
        this.error(
          `A vm with this name already exists. Please choose a unique name.`,
        );
      }

      throw error;
    }
  }
  async getOperatingSystems(): Promise<IGETOperatingSystems> {
    this.spinner.start('Loading...');
    try {
      const oss = await this.got('oss').json<IGETOperatingSystems>();

      this.spinner.stop();

      return oss;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptOperatingSystems(oss: IGETOperatingSystems) {
    const { os } = (await inquirer.prompt({
      name: 'os',
      type: 'list',
      message: 'Select an OS:',
      choices: [...Object.keys(oss).map((platform) => platform)],
    })) as { os: string };

    return os;
  }

  async promptOperatingSystemVersions(
    osName: string,
    oss: IGETOperatingSystems,
  ) {
    const { osVersion } = (await inquirer.prompt({
      name: 'osVersion',
      type: 'list',
      message: `Select the ${osName[0].toUpperCase() + osName.slice(1)} version:`,
      choices: [...oss[osName].map((version) => version)],
    })) as { osVersion: string };

    return osVersion;
  }

  async promptVMName() {
    const { vmName } = (await inquirer.prompt({
      message: 'Enter vm name: ',
      type: 'input',
      name: 'vmName',
      validate: (input) => input.length > 3 && input.length < 20,
    })) as { vmName: string };
    if (!checkVMNameRegexPattern(vmName)) {
      this.error(
        'Invalid vm name. It must start with a lowercase letter, contain only lowercase letters, numbers, or hyphens, and be between 4 and 19 characters long.',
      );
    }

    return vmName;
  }

  async promptPlan() {
    this.spinner.start('Loading...');

    try {
      const { plans } = await this.got('plans').json<{ plans: any }>();
      this.spinner.stop();
      const { plan } = (await inquirer.prompt({
        name: 'plan',
        type: 'list',
        message: 'Please select a plan:',
        choices: Object.keys(plans).map((planKey) => {
          const planDetails = plans[planKey];
          const { RAM, CPU, volume, monthlyPrice } = planDetails;
          const ram = `RAM: ${RAM.amount}${' '.repeat(
            4 - RAM.amount.toString().length,
          )} GB`;
          const cpu = `CPU: ${CPU.amount}${' '.repeat(
            4 - CPU.amount.toString().length,
          )} Core${CPU.amount > 1 ? 's' : ' '}`;

          const disk = `Disk: ${volume}${' '.repeat(
            4 - volume.toString().length,
          )} GB`;
          const price = `Price: ${monthlyPrice.toLocaleString()}${' '.repeat(
            10 - monthlyPrice.toLocaleString().length,
          )} Tomans/Month`;

          return {
            value: planKey,
            name: `${ram.padEnd(8)} | ${cpu.padEnd(10)} | ${disk.padEnd(8)} | ${price}`,
          };
        }),
      })) as { plan: string };

      return plan;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  async promptSSHKey() {
    const SSHKeys: string[] = [];
    while (await this.SSHKeyConfirmation()) {
      const { SSHKey } = (await inquirer.prompt({
        message: 'Enter SSH Key: ',
        name: 'SSHKey',
        type: 'input',
        validate: (input) => input.length !== 0,
      })) as { SSHKey: string };
      SSHKeys.push(SSHKey);
    }
    return SSHKeys;
  }
  private SSHConfirmationCount = 0;
  async SSHKeyConfirmation() {
    const { shouldContinue } = (await inquirer.prompt({
      message: `${this.SSHConfirmationCount == 0 ? 'Add SSH Key?' : 'Add another SSH Key?'} (Default: No)`,
      type: 'confirm',
      default: false,
      name: 'shouldContinue',
    })) as { shouldContinue: boolean };
    if (shouldContinue) this.SSHConfirmationCount++;
    return shouldContinue;
  }

  async getVmState(vmName: string) {
    const { vms } = await this.got('vm').json<IGetVMsResponse>();

    const vm = vms.filter((vm) => vm.name === vmName)[0];
    return vm.state;
  }
}
