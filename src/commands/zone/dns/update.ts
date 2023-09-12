import ora from 'ora';
import inquirer from 'inquirer';
import Command, { IConfig } from '../../../base.js';
import { Flags } from '@oclif/core';
import { createDebugLogger } from '../../../utils/output.js';
import spacing from '../../../utils/spacing.js';
import { ux } from '@oclif/core';
import { string } from '@oclif/core/lib/flags.js';
import { relativeTimeThreshold } from 'moment';
import got, { Options } from 'got';
import * as shamsi from 'shamsi-date-converter';

enum RecordType {
  'A' = 'A',
  'AAAA' = 'AAAA',
  'ALIAS' = 'ALIAS',
  'CNAME' = 'CNAME',
  'MX' = 'MX',
  'SRV' = 'SRV',
  'TXT' = 'TXT',
}

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
  id?: string;
  name: string;
  type: RecordType;
  ttl: number;
  contents: [
    AContentI | ALIASContentI | MXContentI | SRVContentI | TXTContentI
  ];
}

export interface UpdateDNSRecordI {
  name: string;
  type: RecordType;
  ttl: number;
  contents: [
    AContentI | ALIASContentI | MXContentI | SRVContentI | TXTContentI
  ];
}

interface DNSRecordsI {
  status: string;
  data: [DNSRecordI];
}

interface singleDNSRecordI {
  status: string;
  data: DNSRecordI;
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
  SRV: async (flags: any): Promise<[SRVContentI]> => {
    // @ts-ignore
    let result: [SRVContentI] = [];
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
  TXT: async (flags: any): Promise<[TXTContentI]> => {
    // @ts-ignore
    let result: [TXTContentI] = [];
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

export default class Hello extends Command {
  static description = 'update a DNS record for a zone.';

  static baseURL = 'https://dns-service.iran.liara.ir';

  static PATH = 'api/v1/zones/{zone}/dns-records/{id}';

  static aliases = ['zone:dns:ls'];

  static flags = {
    ...Command.flags,
    zone: Flags.string({
      char: 'z',
      description: 'name of the zone (domain)',
    }),
    name: Flags.string({
      char: 'n',
      description: 'record name',
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
    ...ux.table.flags(),
  };

  async run() {
    const { flags } = await this.parse(Hello);

    await this.setGotConfig(flags);

    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const zone = flags.zone || (await this.promptZone());
    const name = flags.name || (await this.promptName());
    const ttl = flags.ttl || (await this.promptTTL());

    const record = await this.getRecordByName(zone, name);
    if (record === undefined || record.id === undefined) {
      this.error(`Record ${name} for zone ${zone} not found`);
    }

    const DNSRecord: DNSRecordI = {
      name: name,
      type: record.type,
      ttl: ttl,
      // @ts-ignore
      contents: await promptRecordContent[record.type](flags),
    };

    try {
      const { data } = await this.got
        .put(Hello.PATH.replace('{zone}', zone).replace('{id}', record.id), {
          json: { ...DNSRecord },
        })
        .json<singleDNSRecordI>();

      // @ts-ignore
      let contents: [string] = [];

      switch (data.type) {
        case RecordType.A:
        case RecordType.AAAA:
          data.contents.map((rec) => {
            // @ts-ignore
            contents.push(rec.ip);
          });
          break;
        case RecordType.ALIAS:
        case RecordType.CNAME:
        case RecordType.MX:
        case RecordType.SRV:
          data.contents.map((rec) => {
            // @ts-ignore
            contents.push(rec.host);
          });
          break;
        case RecordType.TXT:
          data.contents.map((rec) => {
            // @ts-ignore
            contents.push(rec.text);
          });
          break;
        default:
          this.error('Unknown error in showing records');
      }

      const tableData = {
        id: data.id,
        name: data.name,
        type: data.type,
        ttl: data.ttl,
        contents: contents.join('\n'),
      };

      const columnConfig = {
        id: {},
        name: {},
        type: {},
        ttl: {},
        contents: {},
      };

      ux.table([tableData], columnConfig, flags);
    } catch (error) {
      if (error.response && error.response.statusCode === 404) {
        this.error(`Zone not found.`);
      }
      this.error(error.response.message);
    }
  }

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    const new_got = this.got.extend({ prefixUrl: Hello.baseURL });
    this.got = new_got; // baseURL is different for zone api
  }

  async promptName() {
    const { name } = (await inquirer.prompt({
      name: 'name',
      type: 'input',
      message: 'Enter record name:',
      validate: (input) => input.length > 0,
    })) as { name: string };

    return name;
  }

  async promptZone() {
    const { zone } = (await inquirer.prompt({
      name: 'zone',
      type: 'input',
      message: 'Enter domain:',
      validate: (input) => input.length > 2,
    })) as { zone: string };

    return zone;
  }

  async getRecordByName(zone: string, name: string) {
    const { data } = await this.got(
      'api/v1/zones/{zone}/dns-records'.replace('{zone}', zone)
    ).json<DNSRecordsI>();

    if (!data.length) {
      this.error(`Not found any records.
Please open up https://console.liara.ir/zones.`);
    }

    const recordID = data.find((record) => record.name === name);
    return recordID;
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
    })) as { ttl: string };

    return parseInt(ttl);
  }
}
