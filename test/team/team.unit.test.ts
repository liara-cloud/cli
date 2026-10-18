import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import nock from 'nock';
import sinon from 'sinon';
import fs from 'fs-extra';
import path from 'path';
import os from 'node:os';
import { projects } from '../fixtures/projects/fixture.ts';
import TeamUse from '../../src/commands/team/use.ts';
import TeamList from '../../src/commands/team/list.ts';
import AppList from '../../src/commands/app/list.ts';
import AccountUse from '../../src/commands/account/use.ts';

const teams = {
  totalTeams: 2,
  teams: [
    { _id: 'team-1', name: 'Team One', color: 'CARBON_SEA' },
    { _id: 'team-2', name: 'Team Two', color: 'RED_SEA' },
  ],
};

// Teams are listed as the personal account, one page at a time.
const teamsQuery = { teamID: '', page: '1', count: '100' };

const globalConfig = () => ({
  version: '1',
  accounts: {
    me: {
      email: 'me@example.com',
      api_token: 'me-token',
      fullname: 'me',
      avatar: '',
      current: true,
      team: { id: 'team-1', name: 'Team One' },
    },
    other: {
      email: 'other@example.com',
      api_token: 'other-token',
      fullname: 'other',
      avatar: '',
      current: false,
    },
  },
});

describe('team', function () {
  const api = nock('https://api.liara.ir');
  let fsStub: sinon.SinonStub;

  beforeEach(() => {
    fsStub = sinon.stub(fs, 'writeFileSync');
    for (const command of [TeamUse, TeamList, AppList, AccountUse]) {
      sinon
        .stub(command.prototype, 'readGlobalConfig')
        .callsFake(async () => globalConfig());
    }
  });

  afterEach(() => {
    sinon.restore();
    api.done();
    nock.cleanAll();
  });

  const writtenAccounts = () => {
    expect(fsStub.calledOnce).to.be.true;
    expect(fsStub.firstCall.args[0]).to.equal(
      path.join(os.homedir(), '.liara-auth.json'),
    );
    return JSON.parse(fsStub.firstCall.args[1]).accounts;
  };

  describe('team:use', () => {
    it('saves the selected team on the current account', async () => {
      // Teams are listed as the personal account, not the selected team.
      api
        .get('/v2/teams')
        .query(teamsQuery)
        .matchHeader('authorization', 'Bearer me-token')
        .reply(200, teams);

      const { stdout, error } = await runCommand([
        'team:use',
        '--team-id',
        'team-2',
      ]);

      expect(error).to.be.undefined;
      expect(stdout).to.contain('> Current team is: Team Two');
      const accounts = writtenAccounts();
      expect(accounts.me.team).to.deep.equal({
        id: 'team-2',
        name: 'Team Two',
      });
      expect(accounts.other.team).to.be.undefined;
    });

    it('saves the team on the account given by --account', async () => {
      api
        .get('/v2/teams')
        .query(teamsQuery)
        .matchHeader('authorization', 'Bearer other-token')
        .reply(200, teams);

      await runCommand([
        'team:use',
        '--account',
        'other',
        '--team-id',
        'team-1',
      ]);

      const accounts = writtenAccounts();
      expect(accounts.other.team).to.deep.equal({
        id: 'team-1',
        name: 'Team One',
      });
      expect(accounts.me.team.id).to.equal('team-1');
    });

    it('prompts for a team when no team id is given', async () => {
      api.get('/v2/teams').query(teamsQuery).reply(200, teams);
      const prompt = sinon
        .stub(TeamUse.prototype, 'promptTeam')
        .resolves('team-2');

      await runCommand(['team:use']);

      expect(
        prompt.calledOnceWith(teams.teams, {
          personal: true,
          current: 'team-1',
        }),
      ).to.be.true;
      expect(writtenAccounts().me.team.id).to.equal('team-2');
    });

    it('switches back to the personal account from the prompt', async () => {
      api.get('/v2/teams').query(teamsQuery).reply(200, teams);
      sinon.stub(TeamUse.prototype, 'promptTeam').resolves('');

      const { stdout } = await runCommand(['team:use']);

      expect(stdout).to.contain('> Current team is: personal account');
      expect(writtenAccounts().me.team).to.be.undefined;
    });

    it('switches back to the personal account with --personal', async () => {
      const { stdout } = await runCommand(['team:use', '--personal']);

      expect(stdout).to.contain('> Current team is: personal account');
      expect(writtenAccounts().me.team).to.be.undefined;
    });

    it('selects a team by its name', async () => {
      api.get('/v2/teams').query(teamsQuery).reply(200, teams);

      const { stdout } = await runCommand(['team:use', '--team', '"team two"']);

      expect(stdout).to.contain('> Current team is: Team Two');
      expect(writtenAccounts().me.team).to.deep.equal({
        id: 'team-2',
        name: 'Team Two',
      });
    });

    it('throws an error when no team has the name', async () => {
      api.get('/v2/teams').query(teamsQuery).reply(200, teams);

      const { error } = await runCommand(['team:use', '--team', 'missing']);

      expect(error?.message).to.equal("You don't have a team named 'missing'.");
      expect(fsStub.called).to.be.false;
    });

    it('throws an error when the team does not exist', async () => {
      api.get('/v2/teams').query(teamsQuery).reply(200, teams);

      const { error } = await runCommand(['team:use', '--team-id', 'missing']);

      expect(error?.message).to.equal(
        "You don't have a team with ID 'missing'",
      );
      expect(fsStub.called).to.be.false;
    });

    it('throws an error when used with an api token', async () => {
      const { error } = await runCommand([
        'team:use',
        '--api-token',
        'token',
        '--team-id',
        'team-1',
      ]);

      expect(error?.message).to.contain('cannot be set for an api token');
      expect(fsStub.called).to.be.false;
    });
  });

  describe('team:list', () => {
    it('lists teams and marks the selected one', async () => {
      api.get('/v2/teams').query(teamsQuery).reply(200, teams);

      const { stdout } = await runCommand(['team:list', '--output', 'csv']);

      expect(stdout).to.equal('Name,Current\nTeam One,+\nTeam Two,\n');
    });

    it('shows team IDs with --extended', async () => {
      api.get('/v2/teams').query(teamsQuery).reply(200, teams);

      const { stdout } = await runCommand([
        'team:list',
        '--output',
        'csv',
        '--extended',
      ]);

      expect(stdout).to.equal(
        'Name,ID,Current\nTeam One,team-1,+\nTeam Two,team-2,\n',
      );
    });
  });

  describe('default team', () => {
    it('sends the selected team when --team-id is not given', async () => {
      api.get('/v1/projects').query({ teamID: 'team-1' }).reply(200, projects);

      const { error } = await runCommand(['app:list']);

      expect(error).to.be.undefined;
    });

    it('prefers the --team-id flag over the selected team', async () => {
      api.get('/v1/projects').query({ teamID: 'team-2' }).reply(200, projects);

      await runCommand(['app:list', '--team-id', 'team-2']);
    });

    it('uses the personal account when --team-id is empty', async () => {
      api.get('/v1/projects').query({ teamID: '' }).reply(200, projects);

      // runCommand re-splits its args on spaces, so an empty value must use '='.
      await runCommand(['app:list', '--team-id=']);
    });

    it('uses the team selected on the account given by --account', async () => {
      api
        .get('/v1/projects')
        .query({ teamID: '' })
        .matchHeader('authorization', 'Bearer other-token')
        .reply(200, projects);

      await runCommand(['app:list', '--account', 'other']);
    });

    it('ignores the selected team for an explicit api token', async () => {
      api
        .get('/v1/projects')
        .query({ teamID: '' })
        .matchHeader('authorization', 'Bearer token')
        .reply(200, projects);

      await runCommand(['app:list', '--api-token', 'token']);
    });
  });

  describe('account:use', () => {
    it('shows the team selected on the account', async () => {
      const { stdout } = await runCommand(['account:use', '--account', 'me']);

      expect(stdout).to.contain('> Current team is: Team One');
    });
  });
});
