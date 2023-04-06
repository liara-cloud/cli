import IDatabase from './database.js';

export default interface IGetDatabasesResponse {
  databases: IDatabase[];
}
