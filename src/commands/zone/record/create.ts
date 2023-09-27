import ora from 'ora';
import inquirer from 'inquirer';
import Command, { IConfig } from '../../../base.js';
import { Flags, Args } from '@oclif/core';
import { createDebugLogger } from '../../../utils/output.js';

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
  A: async (flags: any): Promise<[IAContent]> => {
    // @ts-ignore
    let result: [IAContent] = [];
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
  AAAA: async (flags: any): Promise<[IAContent]> => {
    // @ts-ignore
    let result: [IAContent] = [];
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
  ALIAS: async (flags: any): Promise<[IALIASContent]> => {
    // @ts-ignore
    let result: [IALIASContent] = [];
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
  CNAME: async (flags: any): Promise<[IALIASContent]> => {
    // @ts-ignore
    let result: [IALIASContent] = [];
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
  MX: async (flags: any): Promise<[IMXContent]> => {
    // @ts-ignore
    let result: [IMXContent] = [];
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
            throw Error('mx inputs should be like this: <hostname> <priority>');
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
  SRV: async (flags: any): Promise<[ISRVContent]> => {
    // @ts-ignore
    let result: [ISRVContent] = [];
    if (flags.srv) {
      flags.srv.map((combineInput: string) => {
        const parsed = combineInput.split(',');
        if (parsed.length != 4) {
          throw Error(
            'srv flag should be like this: <hostname>,<port>,<priority>,<weight>'
          );
        }
        result.push({
          host: parsed[0],
          port: parsed[1],
          priority: parsed[2],
          weight: parsed[3],
        });
      });
    } else {
      let done = false;
      let i = 1;
      do {
        const { combineInput } = (await inquirer.prompt({
          name: 'combineInput',
          type: 'input',
          message: `Enter hostname, port, priority and weight  ${i} (<hostname> <port> <priority> <weight>. leave empty to finish):`,
          validate: (input) =>
            input.length == 0 || input.split(' ').length == 4 || done === true,
        })) as { combineInput: string };
        if (combineInput.length > 0) {
          const parsed = combineInput.split(' ');
          if (parsed.length != 4) {
            throw Error(
              'srv inputs should be like this: <hostname> <port> <priority> <weight>'
            );
          }
          result.push({
            host: parsed[0],
            port: parsed[1],
            priority: parsed[2],
            weight: parsed[3],
          });
        } else {
          done = true;
        }
        i++;
      } while (!done);
    }
    return result;
  },
  TXT: async (flags: any): Promise<[ITXTContent]> => {
    // @ts-ignore
    let result: [ITXTContent] = [];
    if (flags.txt) {
      flags.txt.map((txt: string) => {
        result.push({ text: txt });
      });
    } else {
      let done = false;
      let i = 1;
      do {
        const { text } = (await inquirer.prompt({
          name: 'text',
          type: 'input',
          message: `Enter text${i} (leave empty to finish):`,
          validate: (input) => input.length >= 0 || done === true,
        })) as { text: string };
        if (text.length > 0) {
          result.push({ text: text });
        } else {
          done = true;
        }
        i++;
      } while (!done);
    }
    return result;
  },
};

interface IAContent {
  // AAAA content is also like this.
  ip: string;
}

interface IALIASContent {
  // CNAME content is also like this.
  host: string;
}

interface IMXContent {
  host: string;
  priority: string;
}

interface ISRVContent {
  host: string;
  port: string;
  priority: string;
  weight: string;
}

interface ITXTContent {
  text: string;
}

export interface IDNSRecord {
  name: string;
  type: RecordType;
  ttl: number;
  contents: [
    IAContent | IALIASContent | IMXContent | ISRVContent | ITXTContent
  ];
}

export default class Create extends Command {
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
    srv: Flags.string({
      char: 'r',
      description:
        'hostname, port, priority and weight values for SRV record. srv flag should be like this: <hostname>,<port>,<priority>,<weight>',
      multiple: true,
    }),
    txt: Flags.string({
      char: 'x',
      description: 'text value for record TXT',
      multiple: true,
    }),
  };

  static args = {
    zone: Args.string({ description: 'zone name (domain)', required: true }),
  };

  async run(): Promise<void> {
    this.spinner = ora();

    const { flags, args } = await this.parse(Create);
    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const name = flags.name || (await this.promptName());
    const _type = flags.type || (await this.promptType());
    const ttl = flags.ttl || (await this.promptTTL());
    const zone = args.zone;

    const DNSRecord: IDNSRecord = {
      name: name,
      type: _type as unknown as RecordType,
      ttl: ttl,
      // @ts-ignore
      contents: await promptRecordContent[_type](flags),
    };

    try {
      await this.got.post(Create.PATH.replace('{zone}', zone), {
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
    const new_got = this.got.extend({ prefixUrl: Create.baseURL });
    this.got = new_got; // baseURL is different for zone api
  }
}
