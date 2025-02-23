import { runCommand } from '@oclif/test';
import nock from 'nock';
import { expect } from 'chai';
import { networks } from "../../fixtures/networks/fixture.ts"
describe('app:create', function () {
  let api: ReturnType<typeof nock>;
  const appName = 'test-app';
  const platform = 'laravel';
  const plan = 'small-g2';
  const bundlePlan = 'standard';
  const network = networks.networks[0].name;
  api = nock('https://api.iran.liara.ir');

  api
    .get('/v1/networks')
    .query({ teamID: '' })
    .reply(200, networks);

  api
    .post('/v1/projects/', {
      name: appName,
      planID: plan,
      platform: platform,
      bundlePlanID: bundlePlan,
      network: networks.networks[0]._id,
      readOnlyRootFilesystem: true,
    })
    .query({ teamID: '' })
    .reply(409,{
      statusCode: 409,
      error: "Conflict",
      message: "Project exists.",
      data: null
  });

  afterEach(function () {
    api.done();
    nock.cleanAll();
  });

    it('creates an app with the specified flags', async ()=> {

      const { stdout, stderr } = await runCommand([
        'app:create',
        '--app',
        appName,
        '--platform',
        platform,
        '--plan',
        plan,
        '--feature-plan',
        bundlePlan,
        '--network',
        network,
        '--read-only',
        'true',
      ]);
      expect(stdout).to.equal(`App ${appName} created.\n`);
    });
    it.skip('throws an error if app name already exists',async ()=>{
      api
    .post('/v1/projects/', {
      name: appName,
      planID: plan,
      platform: platform,
      bundlePlanID: bundlePlan,
      network: networks.networks[0]._id,
      readOnlyRootFilesystem: true,
    })
    .query({ teamID: '' })
    .reply(409);

    const { stdout, stderr } = await runCommand([
      'app:create',
      '--app',
      appName,
      '--platform',
      platform,
      '--plan',
      plan,
      '--feature-plan',
      bundlePlan,
      '--network',
      network,
      '--read-only',
      'true',
    ]);
    console.log(stderr);
  expect(stderr).to.equal(`The app already exists. Please use a unique name for your app.`);
    })
  });
