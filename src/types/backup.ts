export interface IBackUp {
  name: string;
  lastModified: string;
  etag: string;
  size: number;
}

export default interface IBackups {
  backups: IBackUp[];
}
