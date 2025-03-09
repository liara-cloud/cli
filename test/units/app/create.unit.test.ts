import { runCommand } from '@oclif/test';
import nock from 'nock';
import { expect } from 'chai';
import { networks } from '../../fixtures/networks/fixture.ts';

describe.skip('app:create', function () {
  const api = nock('https://api.iran.liara.ir');

  beforeEach(() => {
    api.get('/v1/networks').query({ teamID: '' }).reply(200, networks);
  });

  afterEach(() => {
    api.done();
    nock.cleanAll();
  });

  it.skip('creates an app with the specified flags', async () => {
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

  it.skip('throws an error if app name already exists', async () => {
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

  it.skip('throws an error if the network is not found', async () => {
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

  it.skip('thorws an error if user select a feature plan that is not available for free plan', async () => {
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

  it.skip('throws an error if the user does not have enough balance', async () => {
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
});
