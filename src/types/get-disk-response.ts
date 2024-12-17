export interface IDisk {
  name: string;
  size: number;
  updatedAt: string;
  createdAt: string;
  filebrowserUrl: string;
}
export interface IGetDiskResponse {
  disks: IDisk[];
  mounts: IMount[];
}
interface IMount {
  name: string;
  mountedTo: string;
}
