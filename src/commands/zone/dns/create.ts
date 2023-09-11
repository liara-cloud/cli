import ora from 'ora';
import inquirer from 'inquirer';
import Command, { IConfig } from '../../../base.js';
import { Flags, Args } from '@oclif/core';
import { createDebugLogger } from '../../../utils/output.js';
import spacing from '../../../utils/spacing.js';
import { ux } from '@oclif/core';
import { string } from '@oclif/core/lib/flags.js';
import { type } from 'os';

enum RecordType {
  'A',
  'AAAA',
  'ALIAS',
  'CNAME',
  'MX',
  'SRV',
  'TXT',
}

const promptRecordContent = {
  A: async (flags: any): Promise<[AContentI]> => {
    // @ts-ignore
    let result: [AContentI] = [];
    if (flags.ip) {
      flags.ip.map((ip: string) => {
        result.push({ ip: ip });
      });
    } else {
      let done = false;
      let i = 1;
      do {
        const { ip } = (await inquirer.prompt({
          name: 'ip',
          type: 'input',
          message: `Enter ip${i} (leave empty to finish):`,
          validate: (input) => input.length >= 0 || done === true,
        })) as { ip: string };
        if (ip.length > 0) {
          result.push({ ip: ip });
        } else {
          done = true;
        }
        i++;
      } while (!done);
    }
    return result;
  },
  AAAA: async (flags: any): Promise<[AContentI]> => {
    // @ts-ignore
    let result: [AContentI] = [];
    if (flags.ip) {
      flags.ip.map((ip: string) => {
        result.push({ ip: ip });
      });
    } else {
      let done = false;
      let i = 1;
      do {
        const { ip } = (await inquirer.prompt({
          name: 'ip',
          type: 'input',
          message: `Enter ip${i} (leave empty to finish):`,
          validate: (input) => input.length >= 0 || done === true,
        })) as { ip: string };
        if (ip.length > 0) {
          result.push({ ip: ip });
        } else {
          done = true;
        }
        i++;
      } while (!done);
    }
    return result;
  },
  ALIAS: async (flags: any): Promise<[ALIASContentI]> => {
    // @ts-ignore
    let result: [ALIASContentI] = [];
    if (flags.host) {
      result.push({ host: flags.host });
    } else {
      let done = true;
      let i = 1;
      do {
        const { host } = (await inquirer.prompt({
          name: 'host',
          type: 'input',
          message: `Enter host${i} (leave empty to finish):`,
          validate: (input) => input.length >= 0 || done === true,
        })) as { host: string };
        if (host.length > 0) {
          result.push({ host: host });
        } else {
          done = true;
        }
        i++;
      } while (!done);
    }
    return result;
  },
  CNAME: async (flags: any): Promise<[ALIASContentI]> => {
    // @ts-ignore
    let result: [ALIASContentI] = [];
    if (flags.host) {
      result.push({ host: flags.host });
    } else {
      let done = true;
      let i = 1;
      do {
        const { host } = (await inquirer.prompt({
          name: 'host',
          type: 'input',
          message: `Enter host${i} (leave empty to finish):`,
          validate: (input) => input.length >= 0 || done === true,
        })) as { host: string };
        if (host.length > 0) {
          result.push({ host: host });
        } else {
          done = true;
        }
        i++;
      } while (!done);
    }
    return result;
  },
  MX: async (flags: any): Promise<[MXContentI]> => {
    // @ts-ignore
    let result: [MXContentI] = [];
    if (flags.mx) {
      flags.mx.map((combineInput: string) => {
        const parsed = combineInput.split(',');
        if (parsed.length != 2) {
          throw Error('mx flag should be like this: <hostname>,<priority>');
        }
        result.push({ host: parsed[0], priority: parsed[1] });
      });
    } else {
      let done = false;
      let i = 1;
      do {
        const { combineInput } = (await inquirer.prompt({
          name: 'combineInput',
          type: 'input',
          message: `Enter hostname and priority ${i} (<hostname> <priority>. leave empty to finish):`,
          validate: (input) =>
            input.length == 0 || input.split(' ').length == 2 || done === true,
        })) as { combineInput: string };
        if (combineInput.length > 0) {
          const parsed = combineInput.split(' ');
          if (parsed.length != 2) {
            throw Error(
              'hostname and priority should be like this: <hostname> <priority>'
            );
          }
          result.push({ host: parsed[0], priority: parsed[1] });
        } else {
          done = true;
        }
        i++;
      } while (!done);
    }
    return result;
  },
  SRV: (): SRVContentI => {},
  TXT: (): TXTContentI => {},
};

interface AContentI {
  // AAAA content is also like this.
  ip: string;
}

interface ALIASContentI {
  // CNAME content is also like this.
  host: string;
}

interface MXContentI {
  host: string;
  priority: string;
}

interface SRVContentI {
  host: string;
  port: string;
  priority: string;
  weight: string;
}

interface TXTContentI {
  text: string;
}

export interface DNSRecordI {
  name: string;
  type: RecordType;
  ttl: number;
  contents: [
    AContentI | ALIASContentI | MXContentI | SRVContentI | TXTContentI
  ];
}

export default class Hello extends Command {
  static description = 'create a new dns record';

  static baseURL = 'https://dns-service.iran.liara.ir';

  static PATH = 'api/v1/zones/{zone}/dns-records';

  static flags = {
    ...Command.flags,
    name: Flags.string({
      char: 'n',
      description: 'record name',
    }),
    type: Flags.string({
      char: 't',
      description: 'record type',
    }),
    ttl: Flags.integer({
      char: 'l',
      description: 'time to live',
    }),
    ip: Flags.string({
      char: 'i',
      description: 'ip value for record A and AAAA',
      multiple: true,
    }),
    host: Flags.string({
      char: 's',
      description: 'host value for record ALIAS and CNAME',
    }),
    mx: Flags.string({
      char: 'm',
      description:
        'host and priority values for MX record. mx flag should be like this: --mx <hostname>,<priority>',
      multiple: true,
    }),
  };

  static args = {
    zone: Args.string({ description: 'zone name (domain)', required: true }),
  };

  async run(): Promise<void> {
    this.spinner = ora();

    const { flags, args } = await this.parse(Hello);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const name = flags.name || (await this.promptName());
    const _type = flags.type || (await this.promptType());
    const ttl = flags.ttl || (await this.promptTTL());
    const zone = args.zone;

    const DNSRecord: DNSRecordI = {
      name: name,
      type: _type as unknown as RecordType,
      ttl: ttl,
      // @ts-ignore
      contents: await promptRecordContent[_type](flags),
    };

    try {
      await this.got.post(Hello.PATH.replace('{zone}', zone), {
        json: { ...DNSRecord },
      });
      this.log(`Record ${name} created.`);
    } catch (error) {
      debug(error.message);

      if (error.response && error.response.body) {
        debug(JSON.stringify(error.response.body));
      }

      if (error.response && error.response.statusCode === 400) {
        this.error(`Enter correct infortmation.`);
      }

      if (error.response && error.response.statusCode === 404) {
        this.error(`Zone does not exist.`);
      }

      if (error.response && error.response.statusCode === 409) {
        this.error(`This record already exists.`);
      }

      this.error(`Could not create the record. Please try again.`);
    }
  }

  async promptName() {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter record name:',
      validate: (input) => input.length > 2,
    })) as { name: string };

    return name;
  }

  async promptType() {
    const { type } = (await inquirer.prompt({
      name: 'type',
      type: 'input',
      message: 'Enter record type:',
      validate: (input: RecordType) =>
        Object.values(RecordType).includes(input),
    })) as { type: string };

    return type;
  }

  async promptTTL() {
    const { ttl } = (await inquirer.prompt({
      name: 'ttl',
      type: 'input',
      message: 'Enter record ttl:',
      validate: (input) => {
        const parsed = parseInt(input);
        return !isNaN(parsed);
      },
    })) as { ttl: number };

    return ttl;
  }

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    const new_got = this.got.extend({ prefixUrl: Hello.baseURL });
    this.got = new_got; // baseURL is different for zone api
  }
}
