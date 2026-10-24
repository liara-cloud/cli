import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import { expect } from 'chai';
import { networks } from '../fixtures/networks/fixture.ts';
import { stubGlobalConfig } from '../helpers/stubs.ts';

const unableToCreate = 'Unable to Create Database';

describe('db:create', function () {
  const api = nock('https://api.liara.ir');
  const network = networks.networks[0];
  const flags = [
    'db:create',
    '--name',
    'test-db',
    '--type',
    'postgres',
    '--version',
    '16',
    '--network',
    network.name,
    '--public-network',
    '--plan',
    'small',
    '--feature-plan',
    'standard',
    '--yes',
  ];

  const expectCreate = () =>
    api
      .post('/v1/databases', {
        hostname: 'test-db',
        planID: 'small',
        bundlePlanID: 'standard',
        publicNetwork: true,
        type: 'postgres',
        version: '16',
        network: network._id,
      })
      .query({ teamID: '' });

  beforeEach(() => {
    nock.disableNetConnect();
    stubGlobalConfig();
    api.get('/v1/networks').query({ teamID: '' }).reply(200, networks);
  });

  afterEach(() => {
    api.done();
    nock.cleanAll();
    nock.enableNetConnect();
    sinon.restore();
  });

  it('creates the database', async () => {
    expectCreate().reply(200);

    const { stdout, error } = await runCommand(flags);

    expect(error).to.equal(undefined);
    expect(stdout).to.include('Database test-db created.');
  });

  for (const [title, status, body, message] of [
    [
      'the feature plan is not available for the free plan',
      400,
      {
        statusCode: 400,
        message: 'bundlePlan is not available for free plan.',
      },
      'The selected feature bundle plan is not available for free plan.',
    ],
    [
      'the database could not be created',
      404,
      { statusCode: 404, message: 'Not Found' },
      'Could not create the database.',
    ],
    [
      'the database already exists',
      409,
      { statusCode: 409, message: 'Conflict' },
      'The database already exists. Please use a unique name for your database.',
    ],
    [
      'the free plan is not available for the type',
      403,
      { statusCode: 403, data: { code: 'free_plan_platform' } },
      'The free plan is not available for postgres database.',
    ],
    [
      'the free plan database limit is reached',
      403,
      { statusCode: 403, data: { code: 'free_plan_count' } },
      'You are allowed to create only one database on the free plan',
    ],
  ] as const) {
    it(`throws an error if ${title}`, async () => {
      expectCreate().reply(status, body);

      const { error } = await runCommand(flags);

      expect(error?.message).to.equal(message);
    });
  }

  it('throws the generic error for a 403 without details', async () => {
    expectCreate().reply(403, { statusCode: 403, message: 'Forbidden' });

    const { error } = await runCommand(flags);

    expect(error?.message).to.include(unableToCreate);
  });

  it('throws the generic error for a response that is not JSON', async () => {
    expectCreate().reply(403, '<html>Forbidden</html>');

    const { error } = await runCommand(flags);

    expect(error?.message).to.include(unableToCreate);
  });

  it('throws the generic error if the request fails without a response', async () => {
    expectCreate().replyWithError('socket hang up');

    const { error } = await runCommand(flags);

    expect(error?.message).to.include(unableToCreate);
  });
});
