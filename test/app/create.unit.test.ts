import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import inquirer from 'inquirer';
import { expect } from 'chai';
import { networks } from '../fixtures/networks/fixture.ts';
import { stubGlobalConfig } from '../helpers/stubs.ts';

describe('app:create', function () {
  const api = nock('https://api.liara.ir');

  beforeEach(() => {
    stubGlobalConfig();
    api.get('/v1/networks').query({ teamID: '' }).reply(200, networks);
  });

  afterEach(() => {
    api.done();
    nock.cleanAll();
    sinon.restore();
  });

  it('creates an app with the specified flags', async () => {
    api
      .post('/v1/projects/', {
        name: 'test-app',
        planID: 'small-g2',
        platform: 'laravel',
        bundlePlanID: 'standard',
        network: networks.networks[0]._id,
        readOnlyRootFilesystem: true,
      })
      .query({ teamID: '' })
      .reply(200);

    const { stdout } = await runCommand([
      'app:create',
      '--app',
      'test-app',
      '--platform',
      'laravel',
      '--plan',
      'small-g2',
      '--feature-plan',
      'standard',
      '--network',
      networks.networks[0].name,
      '--read-only',
      'true',
    ]);

    expect(stdout).to.equal(`App test-app created.\n`);
  });

  it('throws an error if app name already exists', async () => {
    api
      .post('/v1/projects/', {
        name: 'test-app',
        planID: 'small-g2',
        platform: 'laravel',
        bundlePlanID: 'standard',
        network: networks.networks[0]._id,
        readOnlyRootFilesystem: true,
      })
      .query({ teamID: '' })
      .reply(409, {
        statusCode: 409,
        error: 'Conflict',
        message: 'Project exists.',
        data: null,
      });

    const { error } = await runCommand([
      'app:create',
      '--app',
      'test-app',
      '--platform',
      'laravel',
      '--plan',
      'small-g2',
      '--feature-plan',
      'standard',
      '--network',
      networks.networks[0].name,
      '--read-only',
      'true',
    ]);

    expect(error?.message).to.equal(
      'The app already exists. Please use a unique name for your app.',
    );
  });

  it('throws an error if the network is not found', async () => {
    const { error } = await runCommand([
      'app:create',
      '--app',
      'test-app',
      '--platform',
      'laravel',
      '--plan',
      'small-g2',
      '--feature-plan',
      'standard',
      '--network',
      'not-found',
      '--read-only',
      'true',
    ]);

    expect(error?.message).to.equal('Network not-found not found.');
  });

  it('thorws an error if user select a feature plan that is not available for free plan', async () => {
    const { error } = await runCommand([
      'app:create',
      '--app',
      'test-app',
      '--platform',
      'laravel',
      '--plan',
      'free',
      '--feature-plan',
      'standard',
      '--network',
      networks.networks[0].name,
      '--read-only',
      'true',
    ]);

    expect(error?.message).to.equal(
      `Only "free" feature bundle plan is available for free plan.`,
    );
  });

  it('throws an error if the user does not have enough balance', async () => {
    api
      .post('/v1/projects/', {
        name: 'test-app',
        planID: 'small-g2',
        platform: 'laravel',
        bundlePlanID: 'standard',
        network: networks.networks[0]._id,
        readOnlyRootFilesystem: true,
      })
      .query({ teamID: '' })
      .reply(402);

    const { error } = await runCommand([
      'app:create',
      '--app',
      'test-app',
      '--platform',
      'laravel',
      '--plan',
      'small-g2',
      '--feature-plan',
      'standard',
      '--network',
      networks.networks[0].name,
      '--read-only',
      'true',
    ]);

    expect(error?.message).to.equal(
      'Not enough balance. Please charge your account.',
    );
  });

  it('throws proper error if the app creation fails with status code 500', async () => {
    api
      .post('/v1/projects/', {
        name: 'test-app',
        planID: 'small-g2',
        platform: 'laravel',
        bundlePlanID: 'standard',
        network: networks.networks[0]._id,
        readOnlyRootFilesystem: true,
      })
      .query({ teamID: '' })
      .reply(500);

    const { error } = await runCommand([
      'app:create',
      '--app',
      'test-app',
      '--platform',
      'laravel',
      '--plan',
      'small-g2',
      '--feature-plan',
      'standard',
      '--network',
      networks.networks[0].name,
      '--read-only',
      'true',
    ]);

    expect(error?.message).to.equal(`Error: Unable to Create App
        Please try the following steps:
        1. Check your internet connection.
        2. Ensure you have enough balance.
        3. Try again later.
        4. If you still have problems, please contact support by submitting a ticket at https://console.liara.ir/tickets`);
  });

  const createFlags = [
    'app:create',
    '--app',
    'test-app',
    '--platform',
    'laravel',
    '--plan',
    'small-g2',
    '--feature-plan',
    'standard',
    '--network',
    networks.networks[0].name,
    '--read-only',
    'true',
  ];

  const expectCreate = () =>
    api
      .post('/v1/projects/', {
        name: 'test-app',
        planID: 'small-g2',
        platform: 'laravel',
        bundlePlanID: 'standard',
        network: networks.networks[0]._id,
        readOnlyRootFilesystem: true,
      })
      .query({ teamID: '' });

  it('throws an error if the feature plan is not available for the free plan', async () => {
    expectCreate().reply(400, {
      statusCode: 400,
      message: 'bundlePlan is not available for free plan.',
      data: null,
    });

    const { error } = await runCommand(createFlags);

    expect(error?.message).to.equal(
      'The selected feature bundle plan is not available for free plan.',
    );
  });

  it('throws an error if the free plan is not available for the platform', async () => {
    expectCreate().reply(403, {
      statusCode: 403,
      message: 'Forbidden',
      data: { code: 'free_plan_platform' },
    });

    const { error } = await runCommand(createFlags);

    expect(error?.message).to.equal(
      'The free plan is not available for laravel platform.',
    );
  });

  it('throws an error if the free plan app limit is reached', async () => {
    expectCreate().reply(403, {
      statusCode: 403,
      message: 'Forbidden',
      data: { code: 'free_plan_count' },
    });

    const { error } = await runCommand(createFlags);

    expect(error?.message).to.equal(
      'You are allowed to create only one app on the free plan',
    );
  });

  it('throws an error if the app could not be created', async () => {
    expectCreate().reply(404);

    const { error } = await runCommand(createFlags);

    expect(error?.message).to.equal('Could not create the app.');
  });

  it('throws the generic error for a 403 without details', async () => {
    expectCreate().reply(403, { statusCode: 403, message: 'Forbidden' });

    const { error } = await runCommand(createFlags);

    expect(error?.message).to.include('Error: Unable to Create App');
  });

  it('throws the generic error if the request fails without a response', async () => {
    expectCreate().replyWithError('socket hang up');

    const { error } = await runCommand(createFlags);

    expect(error?.message).to.include('Error: Unable to Create App');
  });

  it('sends the read-only flag as given', async () => {
    api
      .post('/v1/projects/', {
        name: 'test-app',
        planID: 'small-g2',
        platform: 'laravel',
        bundlePlanID: 'standard',
        network: networks.networks[0]._id,
        readOnlyRootFilesystem: false,
      })
      .query({ teamID: '' })
      .reply(200);

    const { stdout } = await runCommand([...createFlags.slice(0, -1), 'false']);

    expect(stdout).to.equal('App test-app created.\n');
  });

  it('lists a plan with an 8-digit monthly price', async () => {
    api
      .get('/v1/me')
      .query({ teamID: '' })
      .reply(200, {
        plans: {
          projects: {
            'small-g2': {
              available: true,
              region: 'iran',
              RAM: { amount: 8 },
              CPU: { amount: 4 },
              volume: 100,
              price: 20000,
            },
          },
        },
      });
    api
      .post('/v1/projects/', {
        name: 'test-app',
        planID: 'small-g2',
        platform: 'laravel',
        bundlePlanID: 'standard',
        network: networks.networks[0]._id,
        readOnlyRootFilesystem: true,
      })
      .query({ teamID: '' })
      .reply(200);
    const prompt = sinon
      .stub(inquirer, 'prompt')
      .resolves({ plan: 'small-g2' });

    const { error } = await runCommand(
      createFlags.filter((flag) => flag !== '--plan' && flag !== 'small-g2'),
    );

    expect(error).to.equal(undefined);
    expect((prompt.firstCall.args[0] as any).choices[0].name).to.include(
      `${(14_400_000).toLocaleString()} Tomans/Month`,
    );
  });

  it('does not offer the free plan or the free feature bundle', async () => {
    const plan = {
      available: true,
      region: 'iran',
      RAM: { amount: 1 },
      CPU: { amount: 1 },
      volume: 1,
    };
    api
      .get('/v1/me')
      .twice()
      .query({ teamID: '' })
      .reply(200, {
        plans: {
          projects: {
            free: { ...plan, price: 0 },
            'small-g2': { ...plan, price: 100 },
          },
          projectBundlePlans: {
            'small-g2': {
              free: { available: true, displayPrice: 0 },
              standard: { available: true, displayPrice: 100 },
            },
          },
        },
      });
    api
      .post('/v1/projects/', {
        name: 'test-app',
        planID: 'small-g2',
        platform: 'laravel',
        bundlePlanID: 'standard',
        network: networks.networks[0]._id,
        readOnlyRootFilesystem: true,
      })
      .query({ teamID: '' })
      .reply(200);
    const prompt = sinon.stub(inquirer, 'prompt');
    prompt.onFirstCall().resolves({ plan: 'small-g2' });
    prompt.onSecondCall().resolves({ bundlePlan: 'standard' });

    await runCommand(
      createFlags.filter(
        (flag) =>
          !['--plan', 'small-g2', '--feature-plan', 'standard'].includes(flag),
      ),
    );

    const offered = (call: sinon.SinonSpyCall) =>
      (call.args[0] as any).choices.map((choice: any) => choice.value);
    expect(offered(prompt.firstCall)).to.deep.equal(['small-g2']);
    expect(offered(prompt.secondCall)).to.deep.equal(['standard']);
  });
});
