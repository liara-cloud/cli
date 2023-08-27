export interface IBucket {
  id: string;
  name: string;
  plan: number;
  status: string;
  permission: string;
  project_id: string;
  createdAt: string;
  updatedAt: boolean;
}

export interface IGetBucketsResponse {
  status: string;
  buckets: IBucket[];
}
