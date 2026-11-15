export interface IVMs {
  _id: string;
  plan: string;
  OS: string;
  state: string;
  name: string;
  createdAt: string;
  power: string;
}
export type VMActions = 'start' | 'reboot' | 'shutdown' | 'stop';
// TODO: i don't think we need this but let it be
export interface IGetVMResponse extends IVMs {
  config: {
    SSHKeys: string[];
    rootPassword: string;
    hostname: string;
    sshPort?: number | string;
  };
  IPs: { address: string; version: string }[];
  planDetails: {
    available: boolean;
    region: string;
    monthlyPrice: number;
    hourlyPrice: number;
    IPv4MonthlyPrice?: { [ipCount: string]: number };
    IPv4HourlyPrice?: { [ipCount: string]: number };
    volume: number;
    RAM: {
      amount: number;
    };
    CPU: {
      amount: number;
    };
  };
}

export interface IGetVMsResponse {
  vms: IVMs[];
}
export interface IGetVMOperationsResponse {
  operations: IVMOperations[];
}
export interface IVMOperations {
  name: string;
  state: string;
  createdAt: string;
}

export interface IGETOperatingSystems {
  [key: string]: string[];
}

export interface IGETOperatingSystemsResponse {
  'one-click-apps': IGETOperatingSystems;
  [key: string]: IGETOperatingSystems | string[];
}

export interface IVMPlan {
  available?: boolean;
  region?: string;
  monthlyPrice: number;
  hourlyPrice?: number;
  volume: number;
  RAM: { amount: number };
  CPU: { amount: number };
}

export interface IGetVMPlansResponse {
  plans: { [key: string]: IVMPlan };
}

export interface IVMDisk {
  _id: string;
  name: string;
  size: number;
  createdAt: string;
}

export interface IGetVMDisksResponse {
  disks: IVMDisk[];
}

export interface IVMSnapshot {
  _id: string;
  name: string;
  description?: string;
  sizeB: number;
  createdAt: string;
  isCurrent?: boolean;
}

export type IGetVMSnapshotsResponse = IVMSnapshot[];

export type VMInitScriptType = 'shell' | 'powershell';

export interface IVMInitScript {
  _id: string;
  name: string;
  description?: string;
  type: VMInitScriptType;
  createdAt: string;
}

export interface IGetVMInitScriptsResponse {
  initScripts: IVMInitScript[];
}

export interface IVMResetPasswordResponse {
  password: string;
}

export interface IVMMetricPoint {
  timestamp: number | string;
  value?: number | string | { read?: number; write?: number };
  read?: number;
  write?: number;
}

export interface IVMMetricsHistoryResponse {
  result: IVMMetricPoint[];
}

export interface IVMMetricsSummaryResponse {
  result: {
    cpu?: number | null;
    memory?: number | null;
    disk?: number | null;
    diskIO?: { read?: number | null; write?: number | null };
  } | null;
}

export interface IVMTrafficRow {
  dstip: string;
  sumbytes: number | string;
  minute?: number | string;
}

export interface IVMTrafficResponse {
  result: IVMTrafficRow[];
}

export interface IVMDailyTraffic {
  day: string;
  bytes?: number | string;
  price?: number | string;
}

export interface IVMDailyTrafficResponse {
  result: { daily: IVMDailyTraffic[] };
}
