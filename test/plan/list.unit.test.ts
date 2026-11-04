import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import { expect } from 'chai';
import { stubGlobalConfig } from '../helpers/stubs.ts';

const plan = {
  available: true,
  region: 'iran',
  RAM: { amount: 1 },
  CPU: { amount: 1 },
  volume: 1,
  price: 100,
};

// The API lists the deprecated free bundle first in every plan.
const bundles = {
  free: { displayPrice: 0 },
  basic: { displayPrice: 175_000 },
  standard: { displayPrice: 275_000 },
  pro: { displayPrice: 475_000 },
};

describe('plan:list', function () {
  const api = nock('https://api.liara.ir');

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

  it('hides the free plan and bundle', async () => {
    api
      .get('/v1/me')
      .query({ teamID: '' })
      .reply(200, {
        plans: {
          projects: { free: plan, 'mini-g2': plan },
          projectBundlePlans: { free: bundles, 'mini-g2': bundles },
        },
      });

    const { stdout } = await runCommand(['plan:list', '--output', 'json']);

    const rows = JSON.parse(stdout);
    expect(rows.map((row: any) => row.Plan)).to.deep.equal(['mini-g2']);
    expect(rows[0]).to.include({
      Basic: (175_000).toLocaleString(),
      Standard: (275_000).toLocaleString(),
      Pro: (475_000).toLocaleString(),
    });
  });
});
