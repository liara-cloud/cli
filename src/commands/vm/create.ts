import ora from 'ora';
import inquirer from 'inquirer';
import { Flags } from '@oclif/core';

import Command, { IConfig } from '../../base.js';
import { IAAS_API_URL } from '../../constants.js';
import {
  IGETOperatingSystems,
  IGetVMsResponse,
  IGetVMInitScriptsResponse,
  IGETOperatingSystemsResponse,
} from '../../types/vm.js';
import { createDebugLogger } from '../../utils/output.js';
import {
  APPS_WITHOUT_SSH_PORT,
  formatPlanChoice,
  getDisabledPlans,
  getInitScriptTypeForOS,
  getOSName,
  isWindowsOS,
  validateSSHKey,
  validateSSHPort,
  validateVMName,
} from '../../utils/vm.js';

export default class VmCreate extends Command {
  static flags = {
    ...Command.flags,
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
    os: Flags.string({
      description: 'operating system or one-click app (see "liara vm os")',
    }),
    'os-version': Flags.string({
      description: 'version of the operating system or one-click app',
    }),
    plan: Flags.string({
      char: 'p',
      description: 'vm plan (see "liara vm plans")',
    }),
    'ssh-key': Flags.string({
      description: 'SSH public key to add to the vm (can be repeated)',
      multiple: true,
    }),
    'ssh-port': Flags.integer({
      description: 'SSH port of the vm (default 22)',
    }),
    'init-script': Flags.string({
      description:
        'name or id of an init script to run on the first boot (see "liara vm script list")',
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
      const interactive = !flags.os || !flags.plan;

      const vmName = flags.vm ?? (await this.promptVMName());
      this.validateName(vmName);

      const oss = await this.getOperatingSystems();

      const osName = flags.os ?? (await this.promptOperatingSystems(oss));
      if (flags.os && !oss[osName]) {
        this.error(
          `Unknown operating system "${osName}". Use "liara vm os" to see the available ones.`,
        );
      }

      const osVersion = await this.getOSVersion(
        osName,
        oss,
        flags['os-version'],
      );
      const os = `${osName}-${osVersion}`;

      const plan = await this.getPlan(os, flags.plan);

      const config: {
        SSHKeys?: string[];
        sshPort?: number;
        InitScriptID?: string;
      } = {};

      const windows = isWindowsOS(osName);
      const supportsSSHPort =
        !windows && !APPS_WITHOUT_SSH_PORT.includes(getOSName(osName));

      if (!windows) {
        const sshKeys =
          flags['ssh-key'] ?? (interactive ? await this.promptSSHKey() : []);
        for (const key of sshKeys) {
          const keyError = validateSSHKey(key);
          if (keyError) {
            this.error(keyError);
          }
        }

        if (sshKeys.length > 0) {
          config.SSHKeys = sshKeys;
        }
      } else if (flags['ssh-key']) {
        this.error('SSH keys are not supported on Windows vms.');
      }

      if (supportsSSHPort) {
        const sshPort =
          flags['ssh-port'] ??
          (interactive ? await this.promptSSHPort() : undefined);

        if (sshPort !== undefined) {
          this.validatePort(sshPort);
          config.sshPort = sshPort;
        }
      } else if (flags['ssh-port'] !== undefined) {
        this.error(`The SSH port cannot be set for ${osName}.`);
      }

      const initScriptID = await this.getInitScript(
        osName,
        flags['init-script'],
        interactive,
      );
      if (initScriptID) {
        config.InitScriptID = initScriptID;
      }

      const newVM = {
        OS: os,
        name: vmName,
        plan,
        ...(Object.keys(config).length > 0 ? { config } : {}),
      };
      await this.got.post('vm', {
        json: newVM,
      });
      if (flags.detach) {
        this.spinner.succeed(
          `vm "${vmName}" creation request submitted successfully in detach mode. Use "liara vm info" to view connection details.`,
        );
        return;
      }
      this.spinner.start(`creating vm "${vmName}"...`);
      const intervalID = setInterval(async () => {
        const vmState = await this.getVmState(vmName);

        if (vmState === 'CREATED') {
          this.spinner.succeed(
            `vm "${vmName}" is created successfully. Use "liara vm info" to view connection details.`,
          );
          clearInterval(intervalID);
        }
      }, 2000);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
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
      const oss = await this.got('oss').json<IGETOperatingSystemsResponse>();
      this.spinner.stop();

      const { 'one-click-apps': oneClickApps, ...rest } = oss;
      const flatOss: IGETOperatingSystems = {
        ...oneClickApps,
        ...(rest as IGETOperatingSystems),
      };

      return flatOss;
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

  validateName(vmName: string) {
    const nameError = validateVMName(vmName);
    if (nameError) {
      this.error(nameError);
    }
  }

  validatePort(port: number) {
    const portError = validateSSHPort(port);
    if (portError) {
      this.error(portError);
    }
  }

  async promptVMName() {
    const { vmName } = (await inquirer.prompt({
      message: 'Enter vm name: ',
      type: 'input',
      name: 'vmName',
      validate: (input) => validateVMName(input) ?? true,
    })) as { vmName: string };

    return vmName;
  }

  async getOSVersion(
    osName: string,
    oss: IGETOperatingSystems,
    versionFlag: string | undefined,
  ) {
    if (!versionFlag) {
      return this.promptOperatingSystemVersions(osName, oss);
    }

    if (!oss[osName].includes(versionFlag)) {
      this.error(
        `Unknown version "${versionFlag}" for ${osName}. Available versions: ${oss[osName].join(', ')}.`,
      );
    }

    return versionFlag;
  }

  async getPlan(os: string, planFlag: string | undefined) {
    if (!planFlag) {
      return this.promptPlan(os);
    }

    const { plans } = await this.got('plans').json<{ plans: any }>();
    const available = this.selectablePlans(plans, os);

    if (!available.includes(planFlag)) {
      this.error(
        `The plan "${planFlag}" is not available for ${os}. Available plans: ${available.join(', ')}.`,
      );
    }

    return planFlag;
  }

  selectablePlans(plans: { [key: string]: any }, os: string) {
    const disabled = getDisabledPlans(os);
    return Object.keys(plans).filter(
      (planKey) => !planKey.startsWith('free') && !disabled.includes(planKey),
    );
  }

  async getInitScript(
    osName: string,
    flag: string | undefined,
    interactive: boolean,
  ): Promise<string | undefined> {
    if (!flag && !interactive) {
      return undefined;
    }

    const type = getInitScriptTypeForOS(osName);
    const { initScripts } =
      await this.got('init-scripts').json<IGetVMInitScriptsResponse>();
    const scripts = initScripts.filter((script) => script.type === type);

    if (flag) {
      const matches = scripts.filter(
        (script) => script._id === flag || script.name === flag,
      );

      if (matches.length === 0) {
        this.error(
          `Could not find a ${type} init script named "${flag}". Use "liara vm script list" to see your scripts.`,
        );
      }

      if (matches.length > 1) {
        this.error(
          `More than one init script is named "${flag}". Use its id instead.`,
        );
      }

      return matches[0]._id;
    }

    if (scripts.length === 0) {
      return undefined;
    }

    return this.promptInitScript(scripts.map((script) => script));
  }

  async promptInitScript(
    scripts: { _id: string; name: string; description?: string }[],
  ): Promise<string | undefined> {
    const { script } = (await inquirer.prompt({
      name: 'script',
      type: 'list',
      message: 'Select an init script to run on the first boot:',
      choices: [
        { name: 'None', value: '' },
        ...scripts.map((item) => ({
          name: item.description
            ? `${item.name} - ${item.description}`
            : item.name,
          value: item._id,
        })),
      ],
    })) as { script: string };

    return script || undefined;
  }

  async promptSSHPort(): Promise<number | undefined> {
    const { sshPort } = (await inquirer.prompt({
      name: 'sshPort',
      type: 'input',
      message: 'SSH port (leave empty for the default, 22):',
      validate: (input: string) =>
        input.trim() === '' || (validateSSHPort(input.trim()) ?? true),
    })) as { sshPort: string };

    return sshPort.trim() === '' ? undefined : Number(sshPort);
  }

  async promptPlan(os?: string) {
    this.spinner.start('Loading...');

    try {
      const { plans } = await this.got('plans').json<{ plans: any }>();
      this.spinner.stop();
      const { plan } = (await inquirer.prompt({
        name: 'plan',
        type: 'list',
        message: 'Please select a plan:',
        choices: this.selectablePlans(plans, os ?? '').map((planKey) => ({
          value: planKey,
          name: formatPlanChoice(plans[planKey]),
        })),
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
        validate: (input) => validateSSHKey(input) ?? true,
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
