import ora, { Ora } from 'ora';
import inquirer from 'inquirer';
import { Flags } from '@oclif/core';

import Command, { IConfig } from '../../base.js';
import { IAAS_API_URL } from '../../constants.js';
import { IGETOperatingSystems } from '../../types/vm.js';
import checkRegexPattern from '../../utils/name-regex.js';

export default class VmCreate extends Command {
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

  static override description = 'describe the command here';

  static override examples = ['<%= config.bin %> <%= command.id %>'];

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: IAAS_API_URL,
    });
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(VmCreate);

    this.spinner = ora();

    await this.setGotConfig(flags);

    const SSHKeys = await this.promptSSHKey();

    const oss = await this.getOperatingSystems();

    const osName = await this.promptOperatingSystems(oss);

    const osVersion = await this.promptOperatingSystemVersions(osName, oss);

    const vmName = await this.promptVMName();

    const plan = await this.promptPlan();
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
      message: 'Select a OS:',
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
      message: `Select ${osName} versions:`,
      choices: [...oss[osName].map((version) => version)],
    })) as { osVersion: string };

    return osVersion;
  }

  async promptVMName() {
    const { vmName } = (await inquirer.prompt({
      message: 'Enter VM name: ',
      type: 'input',
      name: 'vmName',
      validate: (input) => input.length > 2,
    })) as { vmName: string };
    if (!checkRegexPattern(vmName)) {
      this.error('Please enter a valid name for your vm.');
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
}
