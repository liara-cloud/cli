import {
  IGetProjectsResponse,
  IProjectDetailsResponse,
} from '../../../src/base';
export const projects: IGetProjectsResponse = {
  projects: [
    {
      _id: '64c7f1a2b3e8c91d0e5f7b2a',
      project_id: 'proj12345',
      type: 'node',
      status: 'ACTIVE',
      scale: 1,
      planID: 'standard-plus-g2',
      bundlePlanID: 'basic',
      created_at: '2023-10-05T12:34:56Z',
      isDeployed: true,
      network: {
        _id: '64c7f1a2b3e8c91d0e5f7b2b',
        name: 'network-abc123',
      },
    },
    {
      _id: '64c7f1a2b3e8c91d0e5f7b2c',
      project_id: 'proj67890',
      type: 'docker',
      status: 'INACTIVE',
      scale: 1,
      planID: 'small-g2',
      bundlePlanID: 'standard',
      created_at: '2023-10-01T09:15:30Z',
      isDeployed: false,
      network: {
        _id: '64c7f1a2b3e8c91d0e5f7b2d',
        name: 'network-xyz789',
      },
    },
  ],
};

export const getNodeProject: IProjectDetailsResponse = {
  project: {
    _id: '64c7f1a2b3e8c91d0e5f7b2a',
    project_id: 'proj12345',
    type: 'node',
    status: 'ACTIVE',
    readOnlyRootFilesystem: true,
    defaultSubdomain: true,
    zeroDowntime: true,
    scale: 1,
    envs: [],
    planID: 'standard-plus-g2',
    bundlePlanID: 'basic',
    network: {
      _id: '64c7f1a2b3e8c91d0e5f7b2b',
      name: 'network-abc123',
    },
    created_at: '2023-10-05T12:34:56Z',
    fixedIPStatus: 'ACTIVE',
    hourlyPrice: 137.5,
    isDeployed: true,
    reservedDiskSpace: 0,
  },
};
