import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import { expect } from 'chai';
import { getNodeProject } from '../fixtures/projects/fixture.ts';
import { stubGlobalConfig } from '../helpers/stubs.ts';

describe('disk:create', function () {
  const api = nock('https://api.liara.ir');
  const app = getNodeProject.project.project_id;
  const flags = ['disk:create', '--app', app, '--name', 'data', '--size', '1'];

  const expectProject = (bundlePlanID = getNodeProject.project.bundlePlanID) =>
    api
      .get(`/v1/projects/${app}`)
      .query({ teamID: '' })
      .reply(200, { project: { ...getNodeProject.project, bundlePlanID } });

  const expectCreate = () =>
    api
      .post(`/v1/projects/${app}/disks`, { name: 'data', size: '1' })
      .query({ teamID: '' });

  beforeEach(() => {
    nock.disableNetConnect();
    stubGlobalConfig();
  });

  afterEach(() => {
    api.done();
    nock.cleanAll();
    nock.enableNetConnect();
    sinon.restore();
  });

  it('creates the disk', async () => {
    expectProject();
    expectCreate().reply(200);

    const { stdout, error } = await runCommand(flags);

    expect(error).to.equal(undefined);
    expect(stdout).to.equal('Disk data created.\n');
  });

  for (const [title, status, body, message] of [
    [
      'there is not enough storage space',
      400,
      { statusCode: 400, message: 'not_enough_storage_space' },
      'Not enough storage space. You can upgrade your plan to get more storage space.',
    ],
    [
      'the size is not a number',
      400,
      { statusCode: 400, message: '"size" must be a number' },
      'Invalid disk size. Size must be a number.',
    ],
    [
      'the disk name is invalid',
      400,
      { statusCode: 400, message: '"name" is not allowed' },
      'Invalid disk name.',
    ],
    [
      'the disk could not be created',
      500,
      { statusCode: 500, message: 'Internal Server Error' },
      'Could not create the disk. Please try again.',
    ],
  ] as const) {
    it(`throws an error if ${title}`, async () => {
      expectProject();
      expectCreate().reply(status, body);

      const { error } = await runCommand(flags);

      expect(error?.message).to.equal(message);
    });
  }

  it('throws an error if the disk limit of the plan is reached', async () => {
    expectProject('free');
    expectCreate().reply(428, {
      statusCode: 428,
      message: 'max_disks_reached',
    });

    const { error } = await runCommand(flags);

    expect(error?.message).to.equal(
      'You can create only 1 disk on the Free plan. Please upgrade your feature bundle plan to create more disks.',
    );
  });

  it('throws an error if the request fails without a response', async () => {
    expectProject();
    expectCreate().replyWithError('socket hang up');

    const { error } = await runCommand(flags);

    expect(error?.message).to.equal(
      'Could not create the disk. Please try again.',
    );
  });
});
