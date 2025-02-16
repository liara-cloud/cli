import inquirer from 'inquirer';
import { IVMs } from '../base.js';

export async function promptVMs(vms: IVMs[]) {
  const { selectedVm } = (await inquirer.prompt({
    name: 'selectedVm',
    type: 'list',
    message: `Please select a vm:`,
    choices: [
      ...vms.map((vm) => ({
        name: `${vm.name} \x1b[34m(${vm.OS})\x1b[0m`,
        value: vm._id,
      })),
    ],
  })) as { selectedVm: string };

  return vms.filter((vm) => vm._id == selectedVm)[0];
}
