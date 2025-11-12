export enum RecordType {
  'A' = 'A',
  'AAAA' = 'AAAA',
  'ALIAS' = 'ALIAS',
  'CNAME' = 'CNAME',
  'MX' = 'MX',
  'SRV' = 'SRV',
  'TXT' = 'TXT',
}

export interface IAContent {
  // AAAA content is also like this.
  ip: string;
}

export interface IALIASContent {
  // CNAME content is also like this.
  host: string;
}

export interface IMXContent {
  host: string;
  priority: string;
}

export interface ISRVContent {
  host: string;
  port: string;
  priority: string;
  weight: string;
}

export interface ITXTContent {
  text: string;
}

export interface IDNSRecord {
  id?: string;
  name: string;
  type: RecordType;
  ttl: number;
  contents: [
    IAContent | IALIASContent | IMXContent | ISRVContent | ITXTContent,
  ];
}

export interface IDNSRecords {
  status: string;
  data: [IDNSRecord];
}

export interface ISingleDNSRecord {
  status: string;
  data: IDNSRecord;
}
