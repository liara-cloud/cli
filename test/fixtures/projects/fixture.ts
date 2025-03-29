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
      project_id: 'testdocker',
      type: 'docker',
      status: 'ACTIVE',
      scale: 1,
      planID: 'medium-g2',
      bundlePlanID: 'standard',
      created_at: '2025-03-16T10:00:19.277Z',
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

export const getDockerProject: IProjectDetailsResponse = {
  project: {
    _id: '65435435432565kihvudoifjoip',
    project_id: 'testdocker',
    type: 'docker',
    status: 'ACTIVE',
    readOnlyRootFilesystem: false,
    defaultSubdomain: true,
    zeroDowntime: true,
    scale: 1,
    envs: [],
    planID: 'medium-g2',
    bundlePlanID: 'standard',
    network: {
      _id: '64c7f1a2b3e8c91d0e5f7b2d',
      name: 'network-xyz789',
    },
    created_at: '2025-03-16T10:00:19.277Z',
    hourlyPrice: 206.9,
    isDeployed: false,
    fixedIPStatus: 'ACTIVE',
    reservedDiskSpace: 2,
  },
};
