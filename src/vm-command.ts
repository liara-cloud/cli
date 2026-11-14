import ora from 'ora';
import inquirer from 'inquirer';

import Command, { IConfig } from './base.js';
import { IAAS_API_URL } from './constants.js';
import { IGetVMResponse, IVMOperations, IVMs } from './types/vm.js';
import { DebugLogger } from './utils/output.js';
import parseJSON from './utils/json-parse.js';
import { promptVMs } from './utils/prompt-vms.js';
import { findByIdOrName } from './utils/vm.js';

export const NO_PERMISSION_MESSAGE =
  "You don't have permission to do this in the current team.";

export const OPERATION_TIMEOUT_MESSAGE =
  'The operation is still in progress. Use "liara vm events" to follow it.';

export interface ISelectVmOptions {
  // Used when no vm matches the filter (or the --vm flag).
  notFound: string;
  filter?: (vm: IVMs) => boolean;
}

export type OperationResult = 'SUCCEEDED' | 'FAILED' | 'TIMEOUT';

// Shared pieces of the vm commands that talk to the IaaS API.
export default abstract class VmCommand extends Command {
  // How many times to check on a running operation before giving up.
  get maxPollAttempts() {
    return 300;
  }

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    this.got = this.got.extend({
      prefixUrl: IAAS_API_URL,
    });
  }

  async prepare(flags: IConfig) {
    this.spinner = ora();
    await this.setGotConfig(flags);
  }

  async sleep(ms: number) {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async selectVm(
    name: string | undefined,
    { notFound, filter }: ISelectVmOptions,
  ): Promise<IVMs> {
    const matches = (vm: IVMs) =>
      (!name || vm.name === name) && (!filter || filter(vm));
    const vms = await this.getVms(notFound, matches);

    return name ? vms[0] : promptVMs(vms);
  }

  async getVmDetails(vm: IVMs) {
    return this.got.get(`vm/${vm._id}`).json<IGetVMResponse>();
  }

  async confirm(message: string) {
    const { confirmation } = (await inquirer.prompt({
      name: 'confirmation',
      type: 'confirm',
      message,
      default: false,
    })) as { confirmation: boolean };

    return confirmation;
  }

  async promptSelect<T>(
    message: string,
    choices: { name: string; value: T }[],
  ): Promise<T> {
    const { selected } = (await inquirer.prompt({
      name: 'selected',
      type: 'list',
      message,
      choices,
    })) as { selected: T };

    return selected;
  }

  // Logs the failure and rethrows it, or raises a friendlier message for the
  // status codes the caller knows about.
  fail(
    error: any,
    debug: DebugLogger,
    messages: { [status: number]: string } = {},
  ): never {
    debug(error.message);

    if (error.response && error.response.body) {
      debug(JSON.stringify(error.response.body));
    }

    const status: number | undefined = error.response?.statusCode;
    const code = parseJSON(error.response?.body)?.data?.code;

    if (status === 403 && code === 'no_permission') {
      this.error(NO_PERMISSION_MESSAGE);
    }

    if (status && messages[status]) {
      this.error(messages[status]);
    }

    throw error;
  }

  // Picks the item the flag points to (by id or name), or asks for one.
  async selectItem<T extends { _id: string; name?: string }>(
    items: T[],
    flag: string | undefined,
    { label, describe }: { label: string; describe: (item: T) => string },
  ): Promise<T> {
    if (flag) {
      const matches = findByIdOrName(items, flag);

      if (matches.length === 0) {
        this.error(`The ${label} "${flag}" does not exist.`);
      }

      if (matches.length > 1) {
        this.error(
          `More than one ${label} is named "${flag}". Use its id instead.`,
        );
      }

      return matches[0];
    }

    const id = await this.promptSelect(
      `Please select a ${label}:`,
      items.map((item) => ({ name: describe(item), value: item._id })),
    );

    return items.find((item) => item._id === id) as T;
  }

  async getLatestOperation(
    vm: IVMs,
    after?: string,
    names?: string[],
  ): Promise<IVMOperations | undefined> {
    const operations = await this.getVMOperations(vm);

    return operations
      .filter((operation) => !after || operation.createdAt > after)
      .filter((operation) => !names || names.includes(operation.name))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  // Remember this before sending the request, so that waitForOperation can
  // tell the operation it started from the older ones.
  async getLatestOperationTime(vm: IVMs): Promise<string | undefined> {
    return (await this.getLatestOperation(vm))?.createdAt;
  }

  async waitForOperation(
    vm: IVMs,
    after: string | undefined,
    names?: string[],
    interval = 2000,
  ): Promise<OperationResult> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      await this.sleep(interval);

      const operation = await this.getLatestOperation(vm, after, names);

      if (operation?.state === 'SUCCEEDED' || operation?.state === 'FAILED') {
        return operation.state;
      }
    }

    return 'TIMEOUT';
  }

  // Shows the spinner while the operation started by the caller runs.
  async followOperation(
    vm: IVMs,
    after: string | undefined,
    texts: { doing: string; succeeded: string; failed: string },
    names?: string[],
  ) {
    this.spinner.start(texts.doing);
    const result = await this.waitForOperation(vm, after, names);

    if (result === 'SUCCEEDED') {
      this.spinner.succeed(texts.succeeded);
    } else if (result === 'FAILED') {
      this.spinner.fail(texts.failed);
      this.exit(1);
    } else {
      this.spinner.warn(OPERATION_TIMEOUT_MESSAGE);
    }

    return result;
  }

  async waitForVm(
    vm: IVMs,
    isDone: (details: IGetVMResponse) => boolean,
    interval = 2000,
  ): Promise<IGetVMResponse | undefined> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      await this.sleep(interval);

      const details = await this.getVmDetails(vm);
      if (isDone(details)) {
        return details;
      }
    }

    return undefined;
  }
}
