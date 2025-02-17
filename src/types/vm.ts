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
  };
  IPs: { address: string; version: string }[];
  planDetails: {
    available: boolean;
    region: string;
    monthlyPrice: number;
    hourlyPrice: number;
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
