export default interface IDatabase {
  _id: string;
  scale: number;
  hostname: string;
  type: string;
  planID: string;
  bundlePlanID: string;
  status: string;
  created_at: string;
}
