import {IGetProjectsResponse} from "../../../src/base"
export const projects: IGetProjectsResponse={
  projects: [
    {
      _id: "64c7f1a2b3e8c91d0e5f7b2a",
      project_id: "proj12345",
      type: "web-application",
      status: "ACTIVE",
      scale: 3,
      planID: "standard-plus-g2",
      bundlePlanID: "basic",
      created_at: "2023-10-05T12:34:56Z",
      isDeployed: true,
      network: {
        _id: "64c7f1a2b3e8c91d0e5f7b2b",
        name: "network-abc123"
      }
    },
    {
      _id: "64c7f1a2b3e8c91d0e5f7b2c",
      project_id: "proj67890",
      type: "backend-service",
      status: "INACTIVE",
      scale: 1,
      planID: "small-g2",
      bundlePlanID: "standard",
      created_at: "2023-10-01T09:15:30Z",
      isDeployed: false,
      network: { 
        _id: "64c7f1a2b3e8c91d0e5f7b2d",
        name: "network-xyz789"
      }
    }
  ]
};