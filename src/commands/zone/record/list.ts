import inquirer from 'inquirer';
import Command, { IConfig } from '../../../base.js';
import { Flags } from '@oclif/core';
import { createDebugLogger } from '../../../utils/output.js';
import { ux } from '@oclif/core';

enum RecordType {
  'A' = 'A',
  'AAAA' = 'AAAA',
  'ALIAS' = 'ALIAS',
  'CNAME' = 'CNAME',
  'MX' = 'MX',
  'SRV' = 'SRV',
  'TXT' = 'TXT',
}

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
  id?: string;
  name: string;
  type: RecordType;
  ttl: number;
  contents: [
    IAContent | IALIASContent | IMXContent | ISRVContent | ITXTContent
  ];
}

interface IDNSRecords {
  status: string;
  data: [IDNSRecord];
}

export default class List extends Command {
  static description = 'list all DNS records for a zone.';

  static baseURL = 'https://dns-service.iran.liara.ir';

  static PATH = 'api/v1/zones/{zone}/dns-records';

  static aliases = ['zone:record:ls'];

  static flags = {
    ...Command.flags,
    zone: Flags.string({
      char: 'z',
      description: 'name of the zone (domain)',
    }),
    ...ux.table.flags(),
  };

  async run() {
    const { flags } = await this.parse(List);

    await this.setGotConfig(flags);

    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const zone = flags.zone || (await this.promptZone());

    try {
      const { data } = await this.got(
        List.PATH.replace('{zone}', zone)
      ).json<IDNSRecords>();

      const tableData = data.map((record) => {
        // @ts-ignore
        let contents: [string] = [];

        switch (record.type) {
          case RecordType.A:
          case RecordType.AAAA:
            record.contents.map((rec) => {
              // @ts-ignore
              contents.push(rec.ip);
            });
            break;
          case RecordType.ALIAS:
          case RecordType.CNAME:
          case RecordType.MX:
          case RecordType.SRV:
            record.contents.map((rec) => {
              // @ts-ignore
              contents.push(rec.host);
            });
            break;
          case RecordType.TXT:
            record.contents.map((rec) => {
              // @ts-ignore
              contents.push(rec.text);
            });
            break;
          default:
            this.error('Unknown error in showing records');
        }
        return {
          id: record.id,
          name: record.name,
          type: record.type,
          ttl: record.ttl,
          contents: contents.join('\n'),
        };
      });

      const columnConfig = {
        id: {},
        name: {},
        type: {},
        ttl: {},
        contents: {},
      };

      ux.table(tableData, columnConfig, flags);
    } catch (error) {
      if (error.response && error.response.statusCode === 404) {
        this.error(`Zone not found.`);
      }
      this.error(error.message);
    }
  }

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    const new_got = this.got.extend({ prefixUrl: List.baseURL });
    this.got = new_got; // baseURL is different for zone api
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
}
