import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import nock from 'nock';
import sinon from 'sinon';
import fs from 'fs-extra';
import TeamCommand from '../../src/team-command.ts';

const TEAM = '65f0c1000000000000000001';
const OTHER_TEAM = '65f0c1000000000000000002';
const MEMBER = '65f0d2000000000000000001';
const OPERATOR_ROLE = '65f0c9000000000000000001';
const MANAGER_ROLE = '65f0c9000000000000000002';
const CUSTOM_ROLE = '65f0c9000000000000000003';
const INVITATION = '65f0e3000000000000000001';
const GRANT = '65f0f4000000000000000001';
const PROJECT = '65f0a0000000000000000001';

const user = { fullname: 'Jane Doe', email: 'jane@example.com', avatar: '' };

const teams = {
  totalTeams: 1,
  teams: [{ _id: TEAM, name: 'backend', color: 'CARBON_SEA' }],
};

const member = {
  _id: MEMBER,
  team: TEAM,
  user,
  role: { _id: OPERATOR_ROLE, name: 'Operator' },
  createdAt: '2026-01-10T08:00:00.000Z',
};

const roles = {
  totalRoles: 3,
  roles: [
    {
      _id: OPERATOR_ROLE,
      name: 'Operator',
      isCustom: false,
      permissions: [{ name: 'operate', type: 'project' }],
    },
    {
      _id: MANAGER_ROLE,
      name: 'Manager',
      isCustom: false,
      permissions: [{ name: 'manage', type: 'project' }],
    },
    {
      _id: CUSTOM_ROLE,
      name: 'Developer',
      isCustom: true,
      permissions: [{ name: 'deploy', type: 'project' }],
    },
  ],
};

const permission = (
  type: string,
  name: string,
  rbac = true,
  dac = true,
  available = true,
) => ({
  type,
  name,
  available,
  availableForRBAC: rbac,
  availableForDAC: dac,
});

const catalog = {
  totalPermissions: 5,
  permissions: [
    permission('project', 'view'),
    permission('project', 'deploy'),
    permission('database', 'view'),
    permission('team', 'manage', true, false),
    permission('project', 'create', false, false, false),
  ],
};

const grants = {
  totalAssignedPermissions: 1,
  assignedPermissions: [
    {
      _id: GRANT,
      name: 'deploy',
      type: 'project',
      team: TEAM,
      member: { _id: MEMBER, user, role: OPERATOR_ROLE, team: TEAM },
      project: { _id: PROJECT, project_id: 'my-app' },
    },
  ],
};

const globalConfig = () => ({
  version: '1',
  accounts: {
    me: {
      email: 'me@example.com',
      api_token: 'me-token',
      fullname: 'me',
      avatar: '',
      current: true,
      team: { id: TEAM, name: 'backend' },
    },
    other: {
      email: 'other@example.com',
      api_token: 'other-token',
      fullname: 'other',
      avatar: '',
      current: false,
      team: { id: TEAM, name: 'backend' },
    },
  },
});

const page = { page: '1', count: '100' };

describe('team management', function () {
  // runCommand re-splits its args on spaces, so values with spaces are quoted.
  const api = nock('https://api.liara.ir');
  let fsStub: sinon.SinonStub;

  // The membership check every team command starts with.
  const mockTeams = (teamID = TEAM) =>
    api
      .get('/v2/teams')
      .query({ teamID, ...page })
      .reply(200, teams);

  const mockList = (path: string, body: object) =>
    api
      .get(`/v2/teams${path}`)
      .query({ teamID: TEAM, ...page })
      .reply(200, body);

  const mockMembers = () =>
    mockList(`/${TEAM}/members`, { totalMembers: 1, members: [member] });

  const writtenAccounts = () => JSON.parse(fsStub.firstCall.args[1]).accounts;

  beforeEach(() => {
    fsStub = sinon.stub(fs, 'writeFileSync');
    sinon
      .stub(TeamCommand.prototype, 'readGlobalConfig')
      .callsFake(async () => globalConfig());
  });

  afterEach(() => {
    sinon.restore();
    api.done();
    nock.cleanAll();
  });

  describe('team resolution', () => {
    it('acts on the selected team', async () => {
      mockTeams();
      mockMembers();

      const { stdout, error } = await runCommand(['team:member:list']);

      expect(error).to.be.undefined;
      expect(stdout).to.contain('jane@example.com');
      expect(stdout).to.contain('Operator');
      expect(stdout).not.to.contain(MEMBER);
    });

    it("fails clearly for a team the user isn't in", async () => {
      mockTeams(OTHER_TEAM);

      const { error } = await runCommand([
        'team:member:list',
        '--team-id',
        OTHER_TEAM,
      ]);

      expect(error?.message).to.contain(
        `You don't have a team with ID '${OTHER_TEAM}'`,
      );
    });

    it('prompts for a team when none is selected', async () => {
      api
        .get('/v2/teams')
        .query({ teamID: '', ...page })
        .matchHeader('authorization', 'Bearer me-token')
        .reply(200, teams);
      mockMembers();
      const prompt = sinon
        .stub(TeamCommand.prototype, 'promptTeam')
        .resolves(TEAM);

      await runCommand(['team:member:list', '--team-id=']);

      expect(prompt.calledOnce).to.be.true;
    });

    it('fetches every page of a list', async () => {
      const members = Array.from({ length: 101 }, (_, index) => ({
        ...member,
        _id: `65f0d2${String(index).padStart(18, '0')}`,
      }));
      mockTeams();
      mockList(`/${TEAM}/members`, {
        totalMembers: 101,
        members: members.slice(0, 100),
      });
      api
        .get(`/v2/teams/${TEAM}/members`)
        .query({ teamID: TEAM, page: '2', count: '100' })
        .reply(200, { totalMembers: 101, members: members.slice(100) });

      const { stdout } = await runCommand([
        'team:member:list',
        '--output',
        'csv',
        '--no-header',
      ]);

      expect(stdout.trim().split('\n')).to.have.length(101);
    });
  });

  describe('errors', () => {
    it('shows a message for the error code', async () => {
      mockTeams();
      api
        .delete(`/v2/teams/${TEAM}/leave`)
        .query({ teamID: TEAM })
        .reply(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Cannot leave team as creator',
          data: { code: 'cannot_leave_team_as_creator' },
        });

      const { error } = await runCommand(['team:leave', '--yes']);

      expect(error?.message).to.equal("You can't leave a team you created.");
      expect(fsStub.called).to.be.false;
    });

    it('reads an error code sent outside of data', async () => {
      mockTeams();
      api.delete(`/v2/teams/${TEAM}`).query({ teamID: TEAM }).reply(400, {
        statusCode: 400,
        message: 'Cannot delete team with usage in current month',
        code: 'cannot_delete_team_with_usage_in_current_month',
      });

      const { error } = await runCommand(['team:delete', '--yes']);

      expect(error?.message).to.contain(
        "this month's usage hasn't been invoiced yet",
      );
    });

    it('shows the API message for an unknown error code', async () => {
      mockTeams();
      api
        .delete(`/v2/teams/${TEAM}/leave`)
        .query({ teamID: TEAM })
        .reply(400, {
          statusCode: 400,
          message: 'Something new went wrong',
          data: { code: 'some_new_code' },
        });

      const { error } = await runCommand(['team:leave', '--yes']);

      expect(error?.message).to.equal('Something new went wrong');
    });
  });

  describe('team:create', () => {
    it('creates a team', async () => {
      api
        .post('/v2/teams', { name: 'backend', color: 'CARBON_SEA' })
        .query({ teamID: '' })
        .reply(200, teams.teams[0]);

      const { stdout } = await runCommand([
        'team:create',
        '--name',
        ' backend ',
        '--color',
        'CARBON_SEA',
      ]);

      expect(stdout).to.contain('Team backend created.');
      expect(stdout).to.contain(`liara team:use --team "backend"`);
    });
  });

  describe('team:delete', () => {
    it('deletes the team and clears it from every account', async () => {
      mockTeams();
      api.delete(`/v2/teams/${TEAM}`).query({ teamID: TEAM }).reply(200);

      const { stdout } = await runCommand(['team:delete', '--yes']);

      expect(stdout).to.contain('Team backend deleted.');
      expect(stdout).to.contain('Switched to your personal account.');
      const accounts = writtenAccounts();
      expect(accounts.me.team).to.be.undefined;
      expect(accounts.other.team).to.be.undefined;
    });

    it('does nothing when not confirmed', async () => {
      mockTeams();
      sinon.stub(TeamCommand.prototype, 'confirm').resolves(false);

      const { stdout } = await runCommand(['team:delete']);

      expect(stdout).to.contain('Operation cancelled');
      expect(fsStub.called).to.be.false;
    });
  });

  describe('team:rename', () => {
    it('renames the team and updates the selection', async () => {
      mockTeams();
      api
        .post(`/v2/teams/${TEAM}/change-team-name/new%20backend`)
        .query({ teamID: TEAM })
        .reply(200);

      const { stdout } = await runCommand([
        'team:rename',
        '--name',
        '"new backend"',
      ]);

      expect(stdout).to.contain('Team backend renamed to new backend.');
      expect(writtenAccounts().me.team).to.deep.equal({
        id: TEAM,
        name: 'new backend',
      });
    });
  });

  describe('team:leave', () => {
    it('leaves the team and clears it only from the current account', async () => {
      mockTeams();
      api.delete(`/v2/teams/${TEAM}/leave`).query({ teamID: TEAM }).reply(200);

      await runCommand(['team:leave', '--yes']);

      const accounts = writtenAccounts();
      expect(accounts.me.team).to.be.undefined;
      expect(accounts.other.team.id).to.equal(TEAM);
    });
  });

  describe('team:change-owner', () => {
    it('transfers the ownership to a member found by email', async () => {
      mockTeams();
      mockMembers();
      api
        .post(`/v2/teams/${TEAM}/${MEMBER}/change-team-creator`)
        .query({ teamID: TEAM })
        .reply(200);

      const { stdout } = await runCommand([
        'team:change-owner',
        '--member',
        'JANE@example.com',
        '--yes',
      ]);

      expect(stdout).to.contain(
        'Jane Doe <jane@example.com> is now the owner of backend.',
      );
    });
  });

  describe('team:member', () => {
    it('removes a member', async () => {
      mockTeams();
      mockMembers();
      api
        .delete(`/v2/teams/${TEAM}/${MEMBER}`)
        .query({ teamID: TEAM })
        .reply(200);

      const { stdout } = await runCommand([
        'team:member:remove',
        '--member',
        'jane@example.com',
        '--yes',
      ]);

      expect(stdout).to.contain('removed from backend');
    });

    it('sets a role by its name', async () => {
      mockTeams();
      mockMembers();
      mockList(`/${TEAM}/roles`, roles);
      api
        .post(`/v2/teams/${TEAM}/change-member-role/${MEMBER}/${MANAGER_ROLE}`)
        .query({ teamID: TEAM })
        .reply(200);

      const { stdout } = await runCommand([
        'team:member:set-role',
        '--member',
        'jane@example.com',
        '--role',
        'Manager',
      ]);

      expect(stdout).to.contain('changed to Manager.');
    });

    it('fails for a member not in the team', async () => {
      mockTeams();
      mockMembers();

      const { error } = await runCommand([
        'team:member:remove',
        '--member',
        'nobody@example.com',
        '--yes',
      ]);

      expect(error?.message).to.equal(
        "Could not find the member 'nobody@example.com' in the team.",
      );
    });
  });

  describe('team:invitation', () => {
    it('invites with --role-id without listing roles', async () => {
      mockTeams();
      api
        .post(`/v2/teams/${TEAM}/invitations`, {
          email: 'new.dev@example.com',
          roleID: OPERATOR_ROLE,
        })
        .query({ teamID: TEAM })
        .reply(200, { link: 'https://console.liara.ir/invite/join?token=abc' });

      const { stdout } = await runCommand([
        'team:invite',
        '--email',
        'new.dev@example.com',
        '--role-id',
        OPERATOR_ROLE,
      ]);

      expect(stdout).to.contain('Invitation sent to new.dev@example.com.');
      expect(stdout).to.contain('invite/join?token=abc');
    });

    it('cancels an invitation found by email', async () => {
      mockTeams();
      mockList(`/${TEAM}/invitations`, {
        totalInvitations: 1,
        invitations: [
          {
            _id: INVITATION,
            team: TEAM,
            email: 'new.dev@example.com',
            role: { name: 'Inspector' },
            status: 'pending',
          },
        ],
      });
      api
        .delete(`/v2/teams/${TEAM}/invitations/${INVITATION}`)
        .query({ teamID: TEAM })
        .reply(200);

      const { stdout } = await runCommand([
        'team:invitation:delete',
        '--invitation',
        'new.dev@example.com',
        '--yes',
      ]);

      expect(stdout).to.contain('Invitation of new.dev@example.com cancelled.');
    });

    it('joins with the link from the invitation email', async () => {
      api
        .get('/v2/teams/invitations/get-team-info')
        .query({ token: 'abc', teamID: '' })
        .reply(200, {
          teamID: TEAM,
          teamName: 'backend',
          teamColor: 'CARBON_SEA',
          roleID: OPERATOR_ROLE,
          roleName: 'Operator',
        });
      api
        .post('/v2/teams/invitations/join')
        .query({ token: 'abc', teamID: '' })
        .reply(200);

      const { stdout } = await runCommand([
        'team:join',
        '--token',
        'https://console.liara.ir/invite/join?token=abc',
        '--yes',
      ]);

      expect(stdout).to.contain('You joined the team backend.');
    });
  });

  describe('team:role', () => {
    it('creates a custom role', async () => {
      mockTeams();
      mockList('/permissions', catalog);
      api
        .post(`/v2/teams/${TEAM}/custom-role`, {
          name: 'Developer',
          permissions: [
            { type: 'project', name: 'deploy' },
            { type: 'team', name: 'manage' },
          ],
        })
        .query({ teamID: TEAM })
        .reply(201);

      const { stdout } = await runCommand([
        'team:role:create',
        '--name',
        'Developer',
        '--permission',
        'project:deploy',
        '--permission',
        'team:manage',
      ]);

      expect(stdout).to.contain('Role Developer created.');
    });

    it('rejects permissions that roles cannot have', async () => {
      mockTeams();
      mockList('/permissions', catalog);

      const { error } = await runCommand([
        'team:role:create',
        '--name',
        'Developer',
        '--permission',
        'project:create',
      ]);

      expect(error?.message).to.contain("Invalid permission 'project:create'");
    });

    it('deletes only custom roles', async () => {
      mockTeams();
      mockList(`/${TEAM}/roles`, roles);

      const { error } = await runCommand([
        'team:role:delete',
        '--role',
        'manager',
        '--yes',
      ]);

      expect(error?.message).to.equal(
        "Could not find the role 'manager' in the team.",
      );
    });
  });

  describe('team:permission', () => {
    it('lists assigned permissions with resource names', async () => {
      mockTeams();
      mockList(`/${TEAM}/assigned-permissions`, grants);

      const { stdout } = await runCommand(['team:permission:list']);

      expect(stdout).to.contain('jane@example.com');
      expect(stdout).to.contain('project:deploy');
      expect(stdout).to.contain('my-app');
    });

    it('assigns a permission on an app found by name in the team', async () => {
      mockTeams();
      mockMembers();
      mockList('/permissions', catalog);
      api
        .get('/v1/projects')
        .query({ teamID: TEAM })
        .reply(200, { projects: [{ _id: PROJECT, project_id: 'my-app' }] });
      api
        .post(`/v2/teams/${TEAM}/${MEMBER}/assign-permission`, {
          permission: { type: 'project', name: 'deploy' },
          resourceID: PROJECT,
        })
        .query({ teamID: TEAM })
        .reply(201);

      const { stdout } = await runCommand([
        'team:permission:assign',
        '--member',
        'jane@example.com',
        '--permission',
        'project:deploy',
        '--resource',
        'my-app',
      ]);

      expect(stdout).to.contain('now has project:deploy on my-app');
    });

    it('rejects permissions that cannot be assigned per resource', async () => {
      mockTeams();
      mockMembers();
      mockList('/permissions', catalog);

      const { error } = await runCommand([
        'team:permission:assign',
        '--member',
        'jane@example.com',
        '--permission',
        'team:manage',
        '--resource-id',
        PROJECT,
      ]);

      expect(error?.message).to.contain("Invalid permission 'team:manage'");
    });

    it('assigns a permission by --resource-id without looking it up', async () => {
      mockTeams();
      mockMembers();
      mockList('/permissions', catalog);
      api
        .post(`/v2/teams/${TEAM}/${MEMBER}/assign-permission`, {
          permission: { type: 'project', name: 'view' },
          resourceID: PROJECT,
        })
        .query({ teamID: TEAM })
        .reply(201);

      const { stdout } = await runCommand([
        'team:permission:assign',
        '--member',
        'jane@example.com',
        '--permission',
        'project:view',
        '--resource-id',
        PROJECT,
      ]);

      expect(stdout).to.contain(`now has project:view on ${PROJECT}`);
    });

    it('revokes an assigned permission', async () => {
      mockTeams();
      mockList(`/${TEAM}/assigned-permissions`, grants);
      api
        .delete(`/v2/teams/${TEAM}/${GRANT}/revoke-permission`)
        .query({ teamID: TEAM })
        .reply(200);

      const { stdout } = await runCommand([
        'team:permission:revoke',
        '--member',
        'jane@example.com',
        '--resource',
        'my-app',
        '--yes',
      ]);

      expect(stdout).to.contain(
        'Revoked project:deploy on my-app for jane@example.com.',
      );
    });

    it('fails when no assigned permission matches', async () => {
      mockTeams();
      mockList(`/${TEAM}/assigned-permissions`, grants);

      const { error } = await runCommand([
        'team:permission:revoke',
        '--member',
        'jane@example.com',
        '--resource',
        'other-app',
        '--yes',
      ]);

      expect(error?.message).to.equal(
        'Could not find a matching assigned permission.',
      );
    });
  });
});
