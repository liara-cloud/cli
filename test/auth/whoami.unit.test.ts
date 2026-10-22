import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import nock from 'nock';
import sinon from 'sinon';
import Whoami from '../../src/commands/whoami.ts';
import { stubProcessExit } from '../helpers/stubs.ts';

const TEAM = '65f0c1000000000000000001';
const OTHER_TEAM = '65f0c1000000000000000002';

const teams = {
  totalTeams: 2,
  teams: [
    { _id: TEAM, name: 'backend', color: 'CARBON_SEA' },
    { _id: OTHER_TEAM, name: 'frontend', color: 'RED_SEA' },
  ],
};

const me = {
  user: { email: 'jane@example.com', fullname: 'Jane Doe', avatar: '' },
};

const globalConfig = (team?: { id: string; name: string }) => ({
  version: '1',
  accounts: {
    jane: {
      email: 'jane@example.com',
      api_token: 'jane-token',
      fullname: 'Jane Doe',
      avatar: '',
      current: true,
      ...(team && { team }),
    },
  },
});

describe('whoami', function () {
  const api = nock('https://api.liara.ir');
  let readGlobalConfig: sinon.SinonStub;

  // Both requests run as the personal account, whatever the team is.
  const mockMe = (token = 'jane-token') =>
    api
      .get('/v1/me')
      .query({ teamID: '' })
      .matchHeader('authorization', `Bearer ${token}`)
      .reply(200, me);

  const mockTeams = () =>
    api
      .get('/v2/teams')
      .query({ teamID: '', page: '1', count: '100' })
      .reply(200, teams);

  beforeEach(() => {
    readGlobalConfig = sinon
      .stub(Whoami.prototype, 'readGlobalConfig')
      .resolves(globalConfig({ id: TEAM, name: 'backend' }));
    sinon.stub(Whoami.prototype, 'readLiaraJsonTeamId').returns(undefined);
  });

  afterEach(() => {
    sinon.restore();
    api.done();
    nock.cleanAll();
  });

  it('shows the current account and the selected team', async () => {
    mockMe();
    mockTeams();

    const { stdout, error } = await runCommand(['whoami']);

    expect(error).to.be.undefined;
    expect(stdout).to.equal(
      `Account: jane (jane@example.com)
Team:    backend (${TEAM}), selected via 'liara team:use'
`,
    );
  });

  it('shows the personal account when no team is selected', async () => {
    readGlobalConfig.resolves(globalConfig());
    mockMe();

    const { stdout } = await runCommand(['whoami']);

    expect(stdout).to.contain('Team:    personal account');
  });

  it('prefers the --team-id flag over the selected team', async () => {
    mockMe();
    mockTeams();

    const { stdout } = await runCommand(['whoami', '--team-id', OTHER_TEAM]);

    expect(stdout).to.contain(
      `Team:    frontend (${OTHER_TEAM}), from --team-id`,
    );
  });

  it('ignores the selected team for an explicit api token', async () => {
    mockMe('token');

    const { stdout } = await runCommand(['whoami', '--api-token', 'token']);

    expect(stdout).to.equal(
      `Account: jane@example.com, from --api-token
Team:    personal account
`,
    );
  });

  it('warns when the selected team is not one of your teams', async () => {
    readGlobalConfig.resolves(globalConfig({ id: 'gone', name: 'old-team' }));
    mockMe();
    mockTeams();

    const { stdout, stderr } = await runCommand(['whoami']);

    expect(stdout).to.contain(
      "Team:    old-team (gone), selected via 'liara team:use'",
    );
    expect(stderr).to.contain("You're not a member of the selected team");
  });

  it('notes a different team set in liara.json', async () => {
    (Whoami.prototype.readLiaraJsonTeamId as sinon.SinonStub).returns(
      OTHER_TEAM,
    );
    mockMe();
    mockTeams();

    const { stdout } = await runCommand(['whoami']);

    expect(stdout).to.contain(
      `Note:    liara.json in this directory sets frontend (${OTHER_TEAM}) for 'liara deploy' and 'liara app:shell'.`,
    );
  });

  it('prints JSON with --json', async () => {
    mockMe();
    mockTeams();

    const { stdout } = await runCommand(['whoami', '--json']);

    expect(JSON.parse(stdout)).to.deep.equal({
      account: {
        name: 'jane',
        email: 'jane@example.com',
        fullname: 'Jane Doe',
      },
      team: { id: TEAM, name: 'backend', member: true, source: 'team-use' },
    });
  });

  it('fails when not logged in', async () => {
    readGlobalConfig.resolves({ version: '1', accounts: {} });

    const { error } = await runCommand(['whoami']);

    expect(error?.message).to.equal(
      "You're not logged in. Please log in using 'liara login'.",
    );
  });

  it('asks to log in again when the token is rejected', async () => {
    // A 401 makes the CLI print the error and exit with code 2.
    const { exited } = stubProcessExit();
    readGlobalConfig.resolves(globalConfig());
    api
      .get('/v1/me')
      .query({ teamID: '' })
      .reply(401, { statusCode: 401, message: 'Unauthorized' });

    const { stderr } = await runCommand(['whoami']);

    expect(await exited).to.equal(2);
    expect(stderr).to.contain('Authentication failed.');
  });
});
