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

interface ISingleDNSRecord {
  status: string;
  data: IDNSRecord;
}

export default class Get extends Command {
  static description = 'get a DNS record for a zone.';

  static baseURL = 'https://dns-service.iran.liara.ir';

  static PATH = 'api/v1/zones/{zone}/dns-records/{id}';

  static flags = {
    ...Command.flags,
    zone: Flags.string({
      char: 'z',
      description: 'name of the zone (domain)',
    }),
    name: Flags.string({
      char: 'n',
      description: 'Name of the record',
    }),
    ...ux.table.flags(),
  };

  async run() {
    const { flags } = await this.parse(Get);

    await this.setGotConfig(flags);

    const debug = createDebugLogger(flags.debug);

    await this.setGotConfig(flags);
    const account = await this.getCurrentAccount();

    ((account && account.region === 'germany') || flags.region === 'germany') &&
      this.error('We do not support germany any more.');

    const zone = flags.zone || (await this.promptZone());
    const name = flags.name || (await this.promptName());

    const recordID = await this.getRecordIDByName(zone, name);
    if (recordID === undefined) {
      this.error(`Record ${name} for zone ${zone} not found`);
    }

    try {
      const { data } = await this.got(
        Get.PATH.replace('{zone}', zone).replace('{id}', recordID)
      ).json<ISingleDNSRecord>();

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
      this.error(error.message);
    }
  }

  async setGotConfig(config: IConfig): Promise<void> {
    await super.setGotConfig(config);
    const new_got = this.got.extend({ prefixUrl: Get.baseURL });
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

  async getRecordIDByName(zone: string, name: string) {
    const { data } = await this.got(
      'api/v1/zones/{zone}/dns-records'.replace('{zone}', zone)
    ).json<IDNSRecords>();

    if (!data.length) {
      this.error(`Not found any records.
Please open up https://console.liara.ir/zones.`);
    }

    const recordID = data.find((record) => record.name === name);
    return recordID?.id;
  }
}
