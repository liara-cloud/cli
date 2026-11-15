import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import inquirer from 'inquirer';
import { expect } from 'chai';
import { stubGlobalConfig } from '../helpers/stubs.ts';
import VmCommand from '../../src/vm-command.ts';
import VmCreate from '../../src/commands/vm/create.ts';

const vm = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  _id: id,
  name,
  power: 'POWERED_OFF',
  state: 'CREATED',
  plan: 'pro-g2',
  OS: 'ubuntu-22.04',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...extra,
});

const vms = {
  vms: [
    vm('vm-1', 'my-vm'),
    vm('vm-2', 'win-vm', { OS: 'windows-2022' }),
    vm('vm-3', 'frozen-vm', { state: 'FROZEN' }),
  ],
};

const details = (ips: string[], extra: Record<string, unknown> = {}) => ({
  ...vm('vm-1', 'my-vm'),
  config: { SSHKeys: ['k1', 'k2'], rootPassword: 'pw', hostname: 'host' },
  IPs: ips.map((address) => ({ address, version: '4' })),
  planDetails: {},
  ...extra,
});

describe('vm commands (extended)', function () {
  const api = nock('https://iaas-api.liara.ir');
  const team = { teamID: '' };

  const expectVms = () => api.get('/vm').query(team).reply(200, vms);
  const get = (url: string, query: Record<string, unknown> = {}) =>
    api.get(url).query({ ...team, ...query });
  const post = (url: string, body?: any) => api.post(url, body).query(team);

  beforeEach(() => {
    nock.disableNetConnect();
    stubGlobalConfig();
    // Polling must not make the tests wait.
    sinon.stub(VmCommand.prototype, 'sleep').resolves();
  });

  afterEach(() => {
    try {
      api.done();
    } finally {
      nock.cleanAll();
      nock.enableNetConnect();
      sinon.restore();
    }
  });

  describe('vm:resize', () => {
    const plans = {
      plans: {
        free: {
          RAM: { amount: 1 },
          CPU: { amount: 1 },
          volume: 1,
          monthlyPrice: 0,
        },
        'pro-g2': {
          RAM: { amount: 4 },
          CPU: { amount: 2 },
          volume: 40,
          monthlyPrice: 100,
        },
        'standard-base-g2': {
          RAM: { amount: 1 },
          CPU: { amount: 1 },
          volume: 10,
          monthlyPrice: 10,
        },
        'plus-g2': {
          RAM: { amount: 8 },
          CPU: { amount: 4 },
          volume: 80,
          monthlyPrice: 200,
        },
      },
    };
    const resize = (plan = 'plus-g2') =>
      api.patch('/vm/resize/vm-1', { plan }).query(team);

    it('changes the plan', async () => {
      expectVms();
      get('/plans').reply(200, plans);
      resize().reply(200);

      const { stdout, error } = await runCommand([
        'vm:resize',
        '--vm',
        'my-vm',
        '--plan',
        'plus-g2',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.include('The plan of vm "my-vm" changed to "plus-g2".');
    });

    it('lets you pick the plan', async () => {
      expectVms();
      get('/plans').reply(200, plans);
      resize().reply(200);
      const prompt = sinon
        .stub(inquirer, 'prompt')
        .resolves({ plan: 'plus-g2' });

      const { error } = await runCommand(['vm:resize', '--vm', 'my-vm']);

      expect(error).to.equal(undefined);
      const { choices } = prompt.firstCall.args[0] as any;
      expect(choices.map((c: any) => c.value)).to.deep.equal([
        'pro-g2',
        'standard-base-g2',
        'plus-g2',
      ]);
      expect(choices[0].name).to.include('(current)');
    });

    it('rejects a plan that does not exist', async () => {
      expectVms();
      get('/plans').reply(200, plans);

      const { error } = await runCommand([
        'vm:resize',
        '--vm',
        'my-vm',
        '--plan',
        'nope',
      ]);

      expect(error?.message).to.include('The plan "nope" is not available');
    });

    it('rejects a plan that is disabled for windows', async () => {
      expectVms();
      get('/plans').reply(200, plans);

      const { error } = await runCommand([
        'vm:resize',
        '--vm',
        'win-vm',
        '--plan',
        'standard-base-g2',
      ]);

      expect(error?.message).to.include('is not available');
    });

    it('rejects the current plan', async () => {
      expectVms();
      get('/plans').reply(200, plans);

      const { error } = await runCommand([
        'vm:resize',
        '--vm',
        'my-vm',
        '--plan',
        'pro-g2',
      ]);

      expect(error?.message).to.equal(
        'The vm is already on the plan "pro-g2".',
      );
    });

    it('refuses a frozen vm', async () => {
      expectVms();

      const { error } = await runCommand([
        'vm:resize',
        '--vm',
        'frozen-vm',
        '--plan',
        'plus-g2',
      ]);

      expect(error?.message).to.include('The vm is frozen');
    });

    for (const [status, message] of [
      [409, 'Please power off the vm first'],
      [410, 'The plan of a free vm cannot be changed.'],
      [428, 'The disk usage of the vm is more than the new plan allows'],
      [404, 'Could not find the vm.'],
    ] as const) {
      it(`explains a ${status} response`, async () => {
        expectVms();
        get('/plans').reply(200, plans);
        resize().reply(status);

        const { error } = await runCommand([
          'vm:resize',
          '--vm',
          'my-vm',
          '--plan',
          'plus-g2',
        ]);

        expect(error?.message).to.include(message);
      });
    }

    it('explains a missing team permission', async () => {
      expectVms();
      get('/plans').reply(200, plans);
      resize().reply(403, { data: { code: 'no_permission' } });

      const { error } = await runCommand([
        'vm:resize',
        '--vm',
        'my-vm',
        '--plan',
        'plus-g2',
      ]);

      expect(error?.message).to.include("don't have permission");
    });
  });

  describe('vm:reset-password', () => {
    const reset = () => post('/vm/reset-password/vm-1');

    it('prints the new password', async () => {
      expectVms();
      reset().reply(200, { password: 'new-secret' });

      const { stdout, error } = await runCommand([
        'vm:reset-password',
        '--vm',
        'my-vm',
        '--force',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.include('The root password of vm "my-vm" was reset.');
      expect(stdout).to.include('New password: new-secret');
    });

    it('calls the user Administrator on windows', async () => {
      expectVms();
      post('/vm/reset-password/vm-2').reply(200, { password: 'x' });

      const { stdout } = await runCommand([
        'vm:reset-password',
        '--vm',
        'win-vm',
        '--force',
      ]);

      expect(stdout).to.include('The Administrator password');
    });

    it('does nothing without confirmation', async () => {
      sinon.stub(VmCommand.prototype, 'confirm').resolves(false);
      expectVms();

      const { stdout, error } = await runCommand([
        'vm:reset-password',
        '--vm',
        'my-vm',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.equal('');
    });

    it('asks to power the vm off first', async () => {
      expectVms();
      reset().reply(409);

      const { error } = await runCommand([
        'vm:reset-password',
        '--vm',
        'my-vm',
        '--force',
      ]);

      expect(error?.message).to.include('Please power off the vm first');
    });
  });

  describe('vm:unfreeze', () => {
    it('unfreezes the vm', async () => {
      expectVms();
      post('/vm/unfreeze/vm-3').reply(200);

      const { stdout, error } = await runCommand([
        'vm:unfreeze',
        '--vm',
        'frozen-vm',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.include('vm "frozen-vm" is being activated.');
    });

    it('only works on frozen vms', async () => {
      expectVms();

      const { error } = await runCommand(['vm:unfreeze', '--vm', 'my-vm']);

      expect(error?.message).to.equal('No frozen vms found.');
    });

    it('explains when the credit is not enough', async () => {
      expectVms();
      post('/vm/unfreeze/vm-3').reply(402);

      const { error } = await runCommand(['vm:unfreeze', '--vm', 'frozen-vm']);

      expect(error?.message).to.include('Your credit is not enough');
    });
  });

  describe('vm:reset-network', () => {
    const operations = (state: string, createdAt: string) =>
      get('/vm/operation/vm-1').reply(200, {
        operations: [{ name: 'RESET_NETWORK', state, createdAt }],
      });

    it('resets the network in detach mode', async () => {
      expectVms();
      post('/vm/reset-network/vm-1').reply(200);

      const { stderr, error } = await runCommand([
        'vm:reset-network',
        '--vm',
        'my-vm',
        '--force',
        '--detach',
      ]);

      expect(error).to.equal(undefined);
      expect(stderr).to.include(
        'Network reset request submitted for vm "my-vm"',
      );
    });

    it('waits for the operation to finish', async () => {
      expectVms();
      operations('SUCCEEDED', '2026-01-01T00:00:00.000Z');
      post('/vm/reset-network/vm-1').reply(200);
      operations('DOING', '2026-02-01T00:00:00.000Z');
      operations('SUCCEEDED', '2026-02-01T00:00:00.000Z');

      const { stderr, error } = await runCommand([
        'vm:reset-network',
        '--vm',
        'my-vm',
        '--force',
      ]);

      expect(error).to.equal(undefined);
      expect(stderr).to.include('The network of vm "my-vm" has been reset.');
    });

    it('fails when the operation fails', async () => {
      expectVms();
      get('/vm/operation/vm-1').reply(200, { operations: [] });
      post('/vm/reset-network/vm-1').reply(200);
      operations('FAILED', '2026-02-01T00:00:00.000Z');

      const { stderr, error } = await runCommand([
        'vm:reset-network',
        '--vm',
        'my-vm',
        '--force',
      ]);

      expect(stderr).to.include('Failed to reset the network of vm "my-vm".');
      expect(error).to.not.equal(undefined);
    });

    it('is not supported on windows', async () => {
      expectVms();

      const { error } = await runCommand([
        'vm:reset-network',
        '--vm',
        'win-vm',
        '--force',
      ]);

      expect(error?.message).to.include('not supported');
    });

    it('asks to power the vm off first', async () => {
      expectVms();
      get('/vm/operation/vm-1').reply(200, { operations: [] });
      post('/vm/reset-network/vm-1').reply(409);

      const { error } = await runCommand([
        'vm:reset-network',
        '--vm',
        'my-vm',
        '--force',
      ]);

      expect(error?.message).to.include('Please power off the vm first');
    });
  });

  describe('vm:ip:add', () => {
    it('adds an ip and waits for it', async () => {
      expectVms();
      get('/vm/vm-1').reply(200, details(['1.1.1.1']));
      post('/vm/extra-ip/vm-1').reply(200);
      get('/vm/vm-1').reply(200, details(['1.1.1.1']));
      get('/vm/vm-1').reply(200, details(['1.1.1.1', '2.2.2.2']));

      const { stderr, stdout, error } = await runCommand([
        'vm:ip:add',
        '--vm',
        'my-vm',
        '--force',
      ]);

      expect(error).to.equal(undefined);
      expect(stderr).to.include(
        'The IP 2.2.2.2 has been assigned to vm "my-vm".',
      );
      expect(stdout).to.include('liara vm reset-network');
    });

    it('shows the price of the plan in the confirmation', async () => {
      const confirm = sinon
        .stub(VmCommand.prototype, 'confirm')
        .resolves(false);
      expectVms();
      get('/vm/vm-1').reply(
        200,
        details(['1.1.1.1'], {
          planDetails: {
            IPv4MonthlyPrice: { 1: 5000 },
            IPv4HourlyPrice: { 1: 7 },
          },
        }),
      );

      await runCommand(['vm:ip:add', '--vm', 'my-vm']);

      expect(confirm.firstCall.args[0]).to.include(
        '7 Tomans/Hour (5,000 Tomans/Month)',
      );
    });

    it('falls back to the default price', async () => {
      const confirm = sinon
        .stub(VmCommand.prototype, 'confirm')
        .resolves(false);
      expectVms();
      get('/vm/vm-1').reply(200, details(['1.1.1.1']));

      await runCommand(['vm:ip:add', '--vm', 'my-vm']);

      expect(confirm.firstCall.args[0]).to.include(
        '277 Tomans/Hour (200,000 Tomans/Month)',
      );
    });

    it('submits the request in detach mode', async () => {
      expectVms();
      get('/vm/vm-1').reply(200, details(['1.1.1.1']));
      post('/vm/extra-ip/vm-1').reply(200);

      const { stderr } = await runCommand([
        'vm:ip:add',
        '--vm',
        'my-vm',
        '--force',
        '--detach',
      ]);

      expect(stderr).to.include('The request has been submitted.');
    });

    for (const [status, message] of [
      [403, 'maximum number of IPs'],
      [429, 'still in progress'],
      [503, 'no assignable IP'],
    ] as const) {
      it(`explains a ${status} response`, async () => {
        expectVms();
        get('/vm/vm-1').reply(200, details(['1.1.1.1']));
        post('/vm/extra-ip/vm-1').reply(status);

        const { error } = await runCommand([
          'vm:ip:add',
          '--vm',
          'my-vm',
          '--force',
        ]);

        expect(error?.message).to.include(message);
      });
    }
  });

  describe('vm:ip:remove', () => {
    it('removes the extra ip and waits for it', async () => {
      expectVms();
      get('/vm/vm-1').reply(200, details(['1.1.1.1', '2.2.2.2']));
      api.delete('/vm/extra-ip/vm-1').query(team).reply(200);
      get('/vm/vm-1').reply(200, details(['1.1.1.1']));

      const { stderr, error } = await runCommand([
        'vm:ip:remove',
        '--vm',
        'my-vm',
        '--force',
      ]);

      expect(error).to.equal(undefined);
      expect(stderr).to.include(
        'The IP 2.2.2.2 has been removed from vm "my-vm".',
      );
    });

    it('fails when the vm has no extra ip', async () => {
      expectVms();
      get('/vm/vm-1').reply(200, details(['1.1.1.1']));

      const { error } = await runCommand([
        'vm:ip:remove',
        '--vm',
        'my-vm',
        '--force',
      ]);

      expect(error?.message).to.equal('This vm has no extra IP.');
    });

    it('does nothing without confirmation', async () => {
      sinon.stub(VmCommand.prototype, 'confirm').resolves(false);
      expectVms();
      get('/vm/vm-1').reply(200, details(['1.1.1.1', '2.2.2.2']));

      const { error } = await runCommand(['vm:ip:remove', '--vm', 'my-vm']);

      expect(error).to.equal(undefined);
    });
  });

  describe('vm:events', () => {
    it('lists the newest event first', async () => {
      expectVms();
      get('/vm/operation/vm-1').reply(200, {
        operations: [
          {
            name: 'OLD_OP',
            state: 'SUCCEEDED',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            name: 'NEW_OP',
            state: 'DOING',
            createdAt: '2026-02-01T00:00:00.000Z',
          },
        ],
      });

      const { stdout, error } = await runCommand([
        'vm:events',
        '--vm',
        'my-vm',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout.indexOf('NEW_OP')).to.be.greaterThan(-1);
      expect(stdout.indexOf('NEW_OP')).to.be.lessThan(stdout.indexOf('OLD_OP'));
    });

    it('says when there are no events', async () => {
      expectVms();
      get('/vm/operation/vm-1').reply(200, { operations: [] });

      const { stdout } = await runCommand(['vm:events', '--vm', 'my-vm']);

      expect(stdout).to.include('There are no events for vm "my-vm".');
    });
  });

  describe('vm:plans and vm:os', () => {
    it('lists the plans without the free ones', async () => {
      get('/plans').reply(200, {
        plans: {
          free: {
            RAM: { amount: 1 },
            CPU: { amount: 1 },
            volume: 1,
            monthlyPrice: 0,
          },
          'pro-g2': {
            RAM: { amount: 4 },
            CPU: { amount: 2 },
            volume: 40,
            monthlyPrice: 1234,
          },
        },
      });

      const { stdout, error } = await runCommand(['vm:plans']);

      expect(error).to.equal(undefined);
      expect(stdout).to.include('pro-g2');
      expect(stdout).to.include((1234).toLocaleString());
      expect(stdout).to.not.match(/^\s*free\s/m);
    });

    it('lists the operating systems and the one-click apps', async () => {
      get('/oss').reply(200, {
        ubuntu: ['20.04', '22.04'],
        'one-click-apps': { gitlabce: ['16'] },
      });

      const { stdout, error } = await runCommand(['vm:os']);

      expect(error).to.equal(undefined);
      expect(stdout).to.match(/ubuntu\s+OS\s+20\.04, 22\.04/);
      expect(stdout).to.match(/gitlabce\s+App\s+16/);
    });
  });

  describe('vm:disk', () => {
    const disks = {
      disks: [
        {
          _id: 'd1',
          name: 'data',
          size: 10,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          _id: 'd2',
          name: 'logs',
          size: 20,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    it('lists the disks', async () => {
      expectVms();
      get('/vm/disk/vm-1').reply(200, disks);

      const { stdout, error } = await runCommand([
        'vm:disk:list',
        '--vm',
        'my-vm',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.match(/data\s+10/);
      expect(stdout).to.match(/logs\s+20/);
    });

    it('says when the vm has no disks', async () => {
      expectVms();
      get('/vm/disk/vm-1').reply(200, { disks: [] });

      const { stdout } = await runCommand(['vm:disk:list', '--vm', 'my-vm']);

      expect(stdout).to.include('has no extra disks');
    });

    it('creates a disk', async () => {
      expectVms();
      post('/vm/disk/vm-1', { size: 5 }).reply(200);

      const { stdout, error } = await runCommand([
        'vm:disk:create',
        '--vm',
        'my-vm',
        '--size',
        '5',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.include('A 5 GB disk was created for vm "my-vm".');
    });

    it('does not create a disk of size zero', async () => {
      const { error } = await runCommand([
        'vm:disk:create',
        '--vm',
        'my-vm',
        '--size',
        '0',
      ]);

      expect(error).to.not.equal(undefined);
    });

    it('explains when there is not enough space', async () => {
      expectVms();
      post('/vm/disk/vm-1', { size: 500 }).reply(428);

      const { error } = await runCommand([
        'vm:disk:create',
        '--vm',
        'my-vm',
        '--size',
        '500',
      ]);

      expect(error?.message).to.include('not enough space');
    });

    it('extends a disk found by name', async () => {
      expectVms();
      get('/vm/disk/vm-1').reply(200, disks);
      post('/vm/disk/vm-1/d1', { newSize: 30 }).reply(200);

      const { stdout, error } = await runCommand([
        'vm:disk:extend',
        '--vm',
        'my-vm',
        '--disk',
        'data',
        '--size',
        '30',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.include(
        'The size of disk "data" is being increased to 30 GB.',
      );
    });

    it('extends a disk found by id', async () => {
      expectVms();
      get('/vm/disk/vm-1').reply(200, disks);
      post('/vm/disk/vm-1/d2', { newSize: 30 }).reply(200);

      const { error } = await runCommand([
        'vm:disk:extend',
        '--vm',
        'my-vm',
        '--disk',
        'd2',
        '--size',
        '30',
      ]);

      expect(error).to.equal(undefined);
    });

    it('lets you pick the disk', async () => {
      expectVms();
      get('/vm/disk/vm-1').reply(200, disks);
      post('/vm/disk/vm-1/d2', { newSize: 30 }).reply(200);
      sinon.stub(inquirer, 'prompt').resolves({ selected: 'd2' });

      const { error } = await runCommand([
        'vm:disk:extend',
        '--vm',
        'my-vm',
        '--size',
        '30',
      ]);

      expect(error).to.equal(undefined);
    });

    it('only accepts a bigger size', async () => {
      expectVms();
      get('/vm/disk/vm-1').reply(200, disks);

      const { error } = await runCommand([
        'vm:disk:extend',
        '--vm',
        'my-vm',
        '--disk',
        'data',
        '--size',
        '10',
      ]);

      expect(error?.message).to.include(
        'must be more than the current size of the disk (10 GB)',
      );
    });

    it('fails for an unknown disk', async () => {
      expectVms();
      get('/vm/disk/vm-1').reply(200, disks);

      const { error } = await runCommand([
        'vm:disk:extend',
        '--vm',
        'my-vm',
        '--disk',
        'nope',
        '--size',
        '30',
      ]);

      expect(error?.message).to.equal('The disk "nope" does not exist.');
    });

    it('fails when two disks share a name', async () => {
      expectVms();
      get('/vm/disk/vm-1').reply(200, {
        disks: [disks.disks[0], { ...disks.disks[1], name: 'data' }],
      });

      const { error } = await runCommand([
        'vm:disk:extend',
        '--vm',
        'my-vm',
        '--disk',
        'data',
        '--size',
        '30',
      ]);

      expect(error?.message).to.include('More than one disk is named "data"');
    });

    it('asks to power the vm off first', async () => {
      expectVms();
      get('/vm/disk/vm-1').reply(200, disks);
      post('/vm/disk/vm-1/d1', { newSize: 30 }).reply(409);

      const { error } = await runCommand([
        'vm:disk:extend',
        '--vm',
        'my-vm',
        '--disk',
        'data',
        '--size',
        '30',
      ]);

      expect(error?.message).to.include('Please power off the vm first');
    });
  });

  describe('vm:snapshot', () => {
    const snapshots = [
      {
        _id: 's1',
        name: 'before-upgrade',
        description: 'safe point',
        sizeB: 1048576,
        createdAt: '2026-01-01T00:00:00.000Z',
        isCurrent: true,
      },
      {
        _id: 's2',
        name: 'old',
        sizeB: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const op = (name: string, state: string, createdAt: string) => ({
      name,
      state,
      createdAt,
    });

    it('lists the snapshots', async () => {
      expectVms();
      get('/vm/snapshot/vm-1').reply(200, snapshots);

      const { stdout, error } = await runCommand([
        'vm:snapshot:list',
        '--vm',
        'my-vm',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.match(/before-upgrade\s+safe point\s+1 MB\s+yes/);
      expect(stdout).to.match(/old\s+-/);
    });

    it('says when there are no snapshots', async () => {
      expectVms();
      get('/vm/snapshot/vm-1').reply(200, []);

      const { stdout } = await runCommand([
        'vm:snapshot:list',
        '--vm',
        'my-vm',
      ]);

      expect(stdout).to.include('has no snapshots');
    });

    it('creates a snapshot in detach mode', async () => {
      expectVms();
      post('/vm/take-snapshot/vm-1', {
        name: 'snap',
        description: 'why',
      }).reply(200);

      const { stderr, error } = await runCommand([
        'vm:snapshot:create',
        '--vm',
        'my-vm',
        '--name',
        'snap',
        '--description',
        'why',
        '--detach',
      ]);

      expect(error).to.equal(undefined);
      expect(stderr).to.include(
        'The snapshot request has been submitted for vm "my-vm".',
      );
    });

    it('waits for the snapshot operation, ignoring other operations', async () => {
      expectVms();
      get('/vm/operation/vm-1').reply(200, { operations: [] });
      post('/vm/take-snapshot/vm-1', { name: 'snap' }).reply(200);
      get('/vm/operation/vm-1').reply(200, {
        operations: [op('REBOOT', 'SUCCEEDED', '2026-02-01T00:00:00.000Z')],
      });
      get('/vm/operation/vm-1').reply(200, {
        operations: [
          op('REBOOT', 'SUCCEEDED', '2026-02-01T00:00:00.000Z'),
          op('CREATE_VM_SNAPSHOT', 'SUCCEEDED', '2026-02-01T00:00:01.000Z'),
        ],
      });

      const { stderr, error } = await runCommand([
        'vm:snapshot:create',
        '--vm',
        'my-vm',
        '--name',
        'snap',
      ]);

      expect(error).to.equal(undefined);
      expect(stderr).to.include('The snapshot "snap" has been created.');
    });

    it('asks for the name when it is not given', async () => {
      sinon.stub(inquirer, 'prompt').resolves({ name: 'asked' });
      expectVms();
      post('/vm/take-snapshot/vm-1', { name: 'asked' }).reply(200);

      const { error } = await runCommand([
        'vm:snapshot:create',
        '--vm',
        'my-vm',
        '--detach',
      ]);

      expect(error).to.equal(undefined);
    });

    it('refuses an empty name', async () => {
      expectVms();

      const { error } = await runCommand([
        'vm:snapshot:create',
        '--vm',
        'my-vm',
        '--name="   "',
        '--detach',
      ]);

      expect(error?.message).to.equal('The snapshot name cannot be empty.');
    });

    it('reverts a snapshot found by name', async () => {
      expectVms();
      get('/vm/snapshot/vm-1').reply(200, snapshots);
      post('/vm/revert-snapshot/vm-1', { snapshotID: 's1' }).reply(200);

      const { stderr, error } = await runCommand([
        'vm:snapshot:revert',
        '--vm',
        'my-vm',
        '--snapshot',
        'before-upgrade',
        '--force',
        '--detach',
      ]);

      expect(error).to.equal(undefined);
      expect(stderr).to.include(
        'The revert request has been submitted for the snapshot "before-upgrade".',
      );
    });

    it('does not revert without confirmation', async () => {
      sinon.stub(VmCommand.prototype, 'confirm').resolves(false);
      expectVms();
      get('/vm/snapshot/vm-1').reply(200, snapshots);

      const { error } = await runCommand([
        'vm:snapshot:revert',
        '--vm',
        'my-vm',
        '--snapshot',
        's1',
      ]);

      expect(error).to.equal(undefined);
    });

    it('waits for a revert to finish', async () => {
      expectVms();
      get('/vm/snapshot/vm-1').reply(200, snapshots);
      get('/vm/operation/vm-1').reply(200, { operations: [] });
      post('/vm/revert-snapshot/vm-1', { snapshotID: 's2' }).reply(200);
      get('/vm/operation/vm-1').reply(200, {
        operations: [
          op('REVERT_VM_SNAPSHOT', 'FAILED', '2026-02-01T00:00:00.000Z'),
        ],
      });

      const { stderr, error } = await runCommand([
        'vm:snapshot:revert',
        '--vm',
        'my-vm',
        '--snapshot',
        'old',
        '--force',
      ]);

      expect(stderr).to.include(
        'Failed to revert vm "my-vm" to the snapshot "old".',
      );
      expect(error).to.not.equal(undefined);
    });

    it('deletes a snapshot', async () => {
      expectVms();
      get('/vm/snapshot/vm-1').reply(200, snapshots);
      post('/vm/delete-snapshot/vm-1', { snapshotID: 's2' }).reply(200);

      const { stderr, error } = await runCommand([
        'vm:snapshot:delete',
        '--vm',
        'my-vm',
        '--snapshot',
        'old',
        '--force',
        '--detach',
      ]);

      expect(error).to.equal(undefined);
      expect(stderr).to.include(
        'The delete request has been submitted for the snapshot "old".',
      );
    });

    it('waits for a delete to finish', async () => {
      expectVms();
      get('/vm/snapshot/vm-1').reply(200, snapshots);
      get('/vm/operation/vm-1').reply(200, { operations: [] });
      post('/vm/delete-snapshot/vm-1', { snapshotID: 's2' }).reply(200);
      get('/vm/operation/vm-1').reply(200, {
        operations: [
          op('DELETE_VM_SNAPSHOT', 'SUCCEEDED', '2026-02-01T00:00:00.000Z'),
        ],
      });

      const { stderr, error } = await runCommand([
        'vm:snapshot:delete',
        '--vm',
        'my-vm',
        '--snapshot',
        'old',
        '--force',
      ]);

      expect(error).to.equal(undefined);
      expect(stderr).to.include('The snapshot "old" has been deleted.');
    });

    it('fails for an unknown snapshot', async () => {
      expectVms();
      get('/vm/snapshot/vm-1').reply(200, snapshots);

      const { error } = await runCommand([
        'vm:snapshot:delete',
        '--vm',
        'my-vm',
        '--snapshot',
        'nope',
        '--force',
      ]);

      expect(error?.message).to.equal('The snapshot "nope" does not exist.');
    });

    it('fails when the vm has no snapshots', async () => {
      expectVms();
      get('/vm/snapshot/vm-1').reply(200, []);

      const { error } = await runCommand([
        'vm:snapshot:revert',
        '--vm',
        'my-vm',
        '--force',
      ]);

      expect(error?.message).to.equal('vm "my-vm" has no snapshots.');
    });

    it('refuses a frozen vm', async () => {
      expectVms();

      const { error } = await runCommand([
        'vm:snapshot:create',
        '--vm',
        'frozen-vm',
        '--name',
        'x',
      ]);

      expect(error?.message).to.include('The vm is frozen');
    });

    it('gives up waiting after too many attempts', async () => {
      sinon.stub(VmCommand.prototype, 'maxPollAttempts').get(() => 2);
      expectVms();
      get('/vm/operation/vm-1').reply(200, { operations: [] });
      post('/vm/take-snapshot/vm-1', { name: 'snap' }).reply(200);
      get('/vm/operation/vm-1').times(2).reply(200, { operations: [] });

      const { stderr, error } = await runCommand([
        'vm:snapshot:create',
        '--vm',
        'my-vm',
        '--name',
        'snap',
      ]);

      expect(error).to.equal(undefined);
      expect(stderr).to.include('still in progress');
    });
  });

  describe('vm:script', () => {
    const scripts = {
      initScripts: [
        {
          _id: 'sc1',
          name: 'setup',
          description: 'installs stuff',
          type: 'shell',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          _id: 'sc2',
          name: 'win-setup',
          type: 'powershell',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    let dir: string;

    beforeEach(async () => {
      dir = await fs.mkdtemp(path.join(os.tmpdir(), 'liara-vm-script-cmd-'));
    });

    afterEach(async () => {
      await fs.remove(dir);
    });

    it('lists the scripts', async () => {
      get('/init-scripts').reply(200, scripts);

      const { stdout, error } = await runCommand(['vm:script:list']);

      expect(error).to.equal(undefined);
      expect(stdout).to.match(/setup\s+shell\s+installs stuff/);
      expect(stdout).to.match(/win-setup\s+powershell\s+-/);
    });

    it('says when there are no scripts', async () => {
      get('/init-scripts').reply(200, { initScripts: [] });

      const { stdout } = await runCommand(['vm:script:list']);

      expect(stdout).to.include('There are no init scripts.');
    });

    it('creates a script from a file', async () => {
      const file = path.join(dir, 'init.ps1');
      await fs.writeFile(file, 'Write-Host hi');
      post('/init-scripts', {
        name: 'mine',
        description: 'desc',
        type: 'powershell',
        content: 'Write-Host hi',
      }).reply(200);

      const { stdout, error } = await runCommand([
        'vm:script:create',
        '--name',
        'mine',
        '--description',
        'desc',
        '--file',
        file,
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.include(
        'The powershell script "mine" has been created.',
      );
    });

    it('creates a shell script from --content', async () => {
      post('/init-scripts', {
        name: 'mine',
        type: 'shell',
        content: 'echo hi',
      }).reply(200);

      const { error } = await runCommand([
        'vm:script:create',
        '--name',
        'mine',
        '--content',
        '"echo hi"',
      ]);

      expect(error).to.equal(undefined);
    });

    it('needs a script', async () => {
      const { error } = await runCommand([
        'vm:script:create',
        '--name',
        'mine',
      ]);

      expect(error?.message).to.equal(
        'Please provide the script using --file or --content.',
      );
    });

    it('rejects an unknown type', async () => {
      const { error } = await runCommand([
        'vm:script:create',
        '--content',
        'x',
        '--type',
        'bash',
      ]);

      expect(error).to.not.equal(undefined);
    });

    it('shows the reason a script is not valid', async () => {
      post('/init-scripts').reply(400);

      const { error } = await runCommand([
        'vm:script:create',
        '--content',
        '"echo hi"',
      ]);

      expect(error?.message).to.equal('The script is not valid.');
    });

    it('updates only what changed and keeps the old content', async () => {
      get('/init-scripts').reply(200, scripts);
      get('/init-scripts/sc1/download').reply(200, 'echo old');
      api
        .put('/init-scripts/sc1', {
          name: 'renamed',
          description: 'installs stuff',
          type: 'shell',
          content: 'echo old',
        })
        .query(team)
        .reply(200);

      const { stdout, error } = await runCommand([
        'vm:script:update',
        '--script',
        'setup',
        '--name',
        'renamed',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.include('The script "setup" has been updated.');
    });

    it('updates the content', async () => {
      get('/init-scripts').reply(200, scripts);
      api
        .put('/init-scripts/sc1', {
          name: 'setup',
          description: 'installs stuff',
          type: 'shell',
          content: 'echo new',
        })
        .query(team)
        .reply(200);

      const { error } = await runCommand([
        'vm:script:update',
        '--script',
        'sc1',
        '--content',
        '"echo new"',
      ]);

      expect(error).to.equal(undefined);
    });

    it('prints a script', async () => {
      get('/init-scripts').reply(200, scripts);
      get('/init-scripts/sc1/download').reply(200, 'echo hi');

      const { stdout, error } = await runCommand([
        'vm:script:download',
        '--script',
        'setup',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.equal('echo hi\n');
    });

    it('saves a script to a file', async () => {
      const output = path.join(dir, 'nested', 'out.sh');
      get('/init-scripts').reply(200, scripts);
      get('/init-scripts/sc1/download').reply(200, 'echo hi');

      const { stdout } = await runCommand([
        'vm:script:download',
        '--script',
        'setup',
        '--output',
        output,
      ]);

      expect(stdout).to.include(`was saved to ${output}`);
      expect(await fs.readFile(output, 'utf8')).to.equal('echo hi');
    });

    it('deletes a script', async () => {
      get('/init-scripts').reply(200, scripts);
      api.delete('/init-scripts/sc2').query(team).reply(200);

      const { stdout, error } = await runCommand([
        'vm:script:delete',
        '--script',
        'win-setup',
        '--force',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.include('The script "win-setup" has been deleted.');
    });

    it('does not delete without confirmation', async () => {
      sinon.stub(VmCommand.prototype, 'confirm').resolves(false);
      get('/init-scripts').reply(200, scripts);

      const { stdout } = await runCommand([
        'vm:script:delete',
        '--script',
        'setup',
      ]);

      expect(stdout).to.equal('');
    });

    it('fails for an unknown script', async () => {
      get('/init-scripts').reply(200, scripts);

      const { error } = await runCommand([
        'vm:script:delete',
        '--script',
        'nope',
        '--force',
      ]);

      expect(error?.message).to.equal('The script "nope" does not exist.');
    });
  });

  describe('vm:metrics', () => {
    it('shows the summary', async () => {
      expectVms();
      get('/vm/vm-1/metrics/summary').reply(200, {
        result: {
          cpu: 12.34,
          memory: 50,
          disk: 7,
          diskIO: { read: 1.5, write: 0.25 },
        },
      });

      const { stdout, error } = await runCommand([
        'vm:metrics',
        '--vm',
        'my-vm',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.match(/12\.3%\s+50%\s+7%\s+1\.5 MB\/s\s+0\.25 MB\/s/);
    });

    it('says when there are no metrics yet', async () => {
      expectVms();
      get('/vm/vm-1/metrics/summary').reply(200, { result: null });

      const { stdout } = await runCommand(['vm:metrics', '--vm', 'my-vm']);

      expect(stdout).to.include('There are no metrics for vm "my-vm" yet.');
    });

    it('shows the history of a metric since the range start', async () => {
      expectVms();
      api
        .get('/vm/vm-1/metrics/cpu')
        .query((q) => q.teamID === '' && Number(q.since) > 0)
        .reply(200, { result: [{ timestamp: 1_700_000_000, value: 42 }] });

      const { stdout, error } = await runCommand([
        'vm:metrics',
        '--vm',
        'my-vm',
        '--metric',
        'cpu',
        '--range',
        '24h',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.match(/42%/);
    });

    it('shows disk io history', async () => {
      expectVms();
      api
        .get('/vm/vm-1/metrics/diskIO')
        .query(true)
        .reply(200, {
          result: [{ timestamp: 1_700_000_000, value: { read: 2, write: 3 } }],
        });

      const { stdout } = await runCommand([
        'vm:metrics',
        '--vm',
        'my-vm',
        '--metric',
        'diskIO',
      ]);

      expect(stdout).to.match(/2 MB\/s\s+3 MB\/s/);
    });

    it('says when a range has no data', async () => {
      expectVms();
      api.get('/vm/vm-1/metrics/memory').query(true).reply(200, { result: [] });

      const { stdout } = await runCommand([
        'vm:metrics',
        '--vm',
        'my-vm',
        '--metric',
        'memory',
      ]);

      expect(stdout).to.include('There is no memory data in this time range.');
    });

    it('rejects an unknown range', async () => {
      const { error } = await runCommand([
        'vm:metrics',
        '--vm',
        'my-vm',
        '--range',
        '2y',
      ]);

      expect(error).to.not.equal(undefined);
    });
  });

  describe('vm:traffic', () => {
    it('sums the traffic by destination', async () => {
      expectVms();
      api
        .get('/vm/traffic-volume/vm-1')
        .query((q) => q.teamID === '' && Number(q.startTimeUnix) > 0)
        .reply(200, {
          result: [
            { dstip: '1.1.1.1', sumbytes: 1024 },
            { dstip: '2.2.2.2', sumbytes: 1_048_576 },
            { dstip: '1.1.1.1', sumbytes: 1024 },
          ],
        });

      const { stdout, error } = await runCommand([
        'vm:traffic',
        '--vm',
        'my-vm',
        '--range',
        '3h',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout.indexOf('2.2.2.2')).to.be.lessThan(
        stdout.indexOf('1.1.1.1'),
      );
      expect(stdout).to.match(/2\.2\.2\.2\s+1 MB/);
      expect(stdout).to.match(/1\.1\.1\.1\s+2 KB/);
    });

    it('says when there is no traffic', async () => {
      expectVms();
      api.get('/vm/traffic-volume/vm-1').query(true).reply(200, { result: [] });

      const { stdout } = await runCommand(['vm:traffic', '--vm', 'my-vm']);

      expect(stdout).to.include('There is no traffic in this time range.');
    });

    it('shows the daily traffic and cost', async () => {
      expectVms();
      const today = new Date();
      const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      api
        .get('/vm/traffic-daily/vm-1')
        .query((q) => q.teamID === '' && Number(q.startTimeUnix) > 0)
        .reply(200, {
          result: { daily: [{ day: key, bytes: 1_048_576, price: 1500.9 }] },
        });

      const { stdout, error } = await runCommand([
        'vm:traffic',
        '--vm',
        'my-vm',
        '--daily',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.match(/1 MB\s+1,500/);
    });
  });

  describe('vm:create flags', () => {
    const oss = {
      ubuntu: ['22.04'],
      windows: ['2022'],
      bigbluebutton: ['2.7'],
      'one-click-apps': {},
    };
    const plans = {
      plans: {
        free: {
          RAM: { amount: 1 },
          CPU: { amount: 1 },
          volume: 1,
          monthlyPrice: 0,
        },
        'pro-g2': {
          RAM: { amount: 4 },
          CPU: { amount: 2 },
          volume: 40,
          monthlyPrice: 1,
        },
        'standard-base-g2': {
          RAM: { amount: 1 },
          CPU: { amount: 1 },
          volume: 1,
          monthlyPrice: 1,
        },
      },
    };
    const scripts = {
      initScripts: [
        { _id: 'sh1', name: 'setup', type: 'shell', createdAt: '' },
        { _id: 'ps1', name: 'win', type: 'powershell', createdAt: '' },
      ],
    };
    const base = [
      'vm:create',
      '--vm',
      'new-vm',
      '--os',
      'ubuntu',
      '--os-version',
      '22.04',
      '--plan',
      'pro-g2',
      '--detach',
    ];

    beforeEach(() => {
      get('/oss').reply(200, oss);
      get('/plans').reply(200, plans);
    });

    it('creates a vm without any prompt', async () => {
      post('/vm', { OS: 'ubuntu-22.04', name: 'new-vm', plan: 'pro-g2' }).reply(
        200,
      );
      const prompt = sinon.stub(inquirer, 'prompt');

      const { stderr, error } = await runCommand(base);

      expect(error).to.equal(undefined);
      expect(prompt.called).to.equal(false);
      expect(stderr).to.include('creation request submitted successfully');
    });

    it('sends the ssh keys, port and init script', async () => {
      get('/init-scripts').reply(200, scripts);
      post('/vm', {
        OS: 'ubuntu-22.04',
        name: 'new-vm',
        plan: 'pro-g2',
        config: {
          SSHKeys: ['ssh-ed25519 AAA a@b', 'ssh-rsa BBB'],
          sshPort: 2222,
          InitScriptID: 'sh1',
        },
      }).reply(200);

      const { error } = await runCommand([
        ...base,
        '--ssh-key',
        '"ssh-ed25519 AAA a@b"',
        '--ssh-key',
        '"ssh-rsa BBB"',
        '--ssh-port',
        '2222',
        '--init-script',
        'setup',
      ]);

      expect(error).to.equal(undefined);
    });

    it('offers only powershell scripts on windows', async () => {
      get('/init-scripts').reply(200, scripts);
      post('/vm', {
        OS: 'windows-2022',
        name: 'new-vm',
        plan: 'pro-g2',
        config: { InitScriptID: 'ps1' },
      }).reply(200);

      const { error } = await runCommand([
        'vm:create',
        '--vm',
        'new-vm',
        '--os',
        'windows',
        '--os-version',
        '2022',
        '--plan',
        'pro-g2',
        '--init-script',
        'win',
        '--detach',
      ]);

      expect(error).to.equal(undefined);
    });

    it('rejects a shell script on windows', async () => {
      get('/init-scripts').reply(200, scripts);

      const { error } = await runCommand([
        'vm:create',
        '--vm',
        'new-vm',
        '--os',
        'windows',
        '--os-version',
        '2022',
        '--plan',
        'pro-g2',
        '--init-script',
        'setup',
        '--detach',
      ]);

      expect(error?.message).to.include(
        'Could not find a powershell init script named "setup"',
      );
    });

    it('rejects ssh keys and port on windows', async () => {
      const keys = await runCommand([
        'vm:create',
        '--vm',
        'new-vm',
        '--os',
        'windows',
        '--os-version',
        '2022',
        '--plan',
        'pro-g2',
        '--ssh-key',
        '"ssh-rsa AAA"',
        '--detach',
      ]);
      expect(keys.error?.message).to.include(
        'SSH keys are not supported on Windows',
      );
    });

    it('rejects an ssh port for bigbluebutton', async () => {
      const { error } = await runCommand([
        'vm:create',
        '--vm',
        'new-vm',
        '--os',
        'bigbluebutton',
        '--os-version',
        '2.7',
        '--plan',
        'pro-g2',
        '--ssh-port',
        '2222',
        '--detach',
      ]);

      expect(error?.message).to.equal(
        'The SSH port cannot be set for bigbluebutton.',
      );
    });

    it('rejects a plan disabled for the os', async () => {
      const { error } = await runCommand([
        'vm:create',
        '--vm',
        'new-vm',
        '--os',
        'windows',
        '--os-version',
        '2022',
        '--plan',
        'standard-base-g2',
        '--detach',
      ]);

      expect(error?.message).to.include(
        'The plan "standard-base-g2" is not available for windows-2022',
      );
    });

    it('rejects a free plan', async () => {
      const { error } = await runCommand([
        'vm:create',
        '--vm',
        'new-vm',
        '--os',
        'ubuntu',
        '--os-version',
        '22.04',
        '--plan',
        'free',
        '--detach',
      ]);

      expect(error?.message).to.include('is not available');
    });

    it('rejects an invalid ssh key', async () => {
      const { error } = await runCommand([
        ...base,
        '--ssh-key',
        '"ssh-rsa AA\u200bAA"',
      ]);

      expect(error?.message).to.include('not valid');
    });

    it('rejects an invalid ssh port', async () => {
      const port25 = await runCommand([...base, '--ssh-port', '25']);
      expect(port25.error?.message).to.include('Port 25');
    });

    it('rejects an unknown os', async () => {
      nock.cleanAll();
      get('/oss').reply(200, oss);
      const unknown = await runCommand([
        'vm:create',
        '--vm',
        'new-vm',
        '--os',
        'nope',
        '--plan',
        'pro-g2',
        '--detach',
      ]);
      expect(unknown.error?.message).to.include(
        'Unknown operating system "nope"',
      );
    });

    it('rejects an unknown version', async () => {
      nock.cleanAll();
      get('/oss').reply(200, oss);
      const { error } = await runCommand([
        'vm:create',
        '--vm',
        'new-vm',
        '--os',
        'ubuntu',
        '--os-version',
        '1',
        '--plan',
        'pro-g2',
        '--detach',
      ]);

      expect(error?.message).to.include(
        'Unknown version "1" for ubuntu. Available versions: 22.04.',
      );
    });

    it('rejects an invalid name before calling the api', async () => {
      nock.cleanAll();

      const { error } = await runCommand([
        'vm:create',
        '--vm',
        '-bad-',
        '--os',
        'ubuntu',
        '--plan',
        'pro-g2',
      ]);

      expect(error?.message).to.include('Invalid vm name');
    });

    it('prompts for the ssh port and init script when running interactively', async () => {
      sinon.stub(inquirer, 'prompt').resolves({ plan: 'pro-g2' });
      sinon.stub(VmCreate.prototype, 'promptSSHKey').resolves([]);
      sinon.stub(VmCreate.prototype, 'promptSSHPort').resolves(2200);
      sinon.stub(VmCreate.prototype, 'promptInitScript').resolves('sh1');
      get('/init-scripts').reply(200, scripts);
      post('/vm', {
        OS: 'ubuntu-22.04',
        name: 'new-vm',
        plan: 'pro-g2',
        config: { sshPort: 2200, InitScriptID: 'sh1' },
      }).reply(200);

      const { error } = await runCommand([
        'vm:create',
        '--vm',
        'new-vm',
        '--os',
        'ubuntu',
        '--os-version',
        '22.04',
        '--detach',
      ]);

      expect(error).to.equal(undefined);
    });
  });

  describe('existing power commands with a frozen vm', () => {
    for (const command of ['vm:start', 'vm:restart', 'vm:stop']) {
      it(`${command} refuses it`, async () => {
        api
          .get('/vm')
          .query(team)
          .reply(200, {
            vms: [
              vm('vm-3', 'frozen-vm', {
                state: 'FROZEN',
                power: command === 'vm:start' ? 'POWERED_OFF' : 'POWERED_ON',
              }),
            ],
          });

        const { error } = await runCommand([
          command,
          '--vm',
          'frozen-vm',
          '--detach',
        ]);

        expect(error?.message).to.include('The vm is frozen');
      });
    }
  });

  describe('vm:info', () => {
    it('shows the ssh port, keys and username', async () => {
      expectVms();
      get('/vm/vm-1').reply(
        200,
        details(['1.1.1.1'], {
          config: {
            SSHKeys: ['a', 'b'],
            rootPassword: 'pw',
            hostname: 'host',
            sshPort: 2222,
          },
          planDetails: { CPU: { amount: 2 }, RAM: { amount: 4 }, volume: 40 },
        }),
      );

      const { stdout, error } = await runCommand(['vm:info', '--vm', 'my-vm']);

      expect(error).to.equal(undefined);
      expect(stdout).to.match(/root\s+pw\s+2222\s+2/);
    });
  });
});
