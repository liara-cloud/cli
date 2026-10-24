import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import { expect } from 'chai';
import { stubGlobalConfig } from '../helpers/stubs.ts';
import VmCreate from '../../src/commands/vm/create.ts';
import VmDelete from '../../src/commands/vm/delete.ts';

const vm = (id: string, name: string, power: string) => ({
  _id: id,
  name,
  power,
  state: 'CREATED',
  plan: 'g1',
  OS: 'ubuntu-22.04',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const vms = {
  vms: [
    vm('vm-1', 'running-vm', 'POWERED_ON'),
    vm('vm-2', 'stopped-vm', 'POWERED_OFF'),
  ],
};

// Every test uses --detach (or never reaches the wait), so no command starts
// polling the vm operations.
describe('vm commands', function () {
  const api = nock('https://iaas-api.liara.ir');

  const expectVms = () => api.get('/vm').query({ teamID: '' }).reply(200, vms);

  const expectPower = (id: string, action: string) =>
    api.patch(`/vm/power/${id}`, { action }).query({ teamID: '' });

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

  describe('vm:info', () => {
    const expectVm = () => api.get('/vm/vm-1').query({ teamID: '' });

    it('throws an error if the vm is not found', async () => {
      expectVms();
      expectVm().reply(404);

      const { error } = await runCommand(['vm:info', '--vm', 'running-vm']);

      expect(error?.message).to.equal('Could not find the vm.');
    });

    it('throws an error if the vm id is invalid', async () => {
      expectVms();
      expectVm().reply(400);

      const { error } = await runCommand(['vm:info', '--vm', 'running-vm']);

      expect(error?.message).to.equal('Invalid vm ID.');
    });

    it('throws an error if no vm has the name', async () => {
      expectVms();

      const { error } = await runCommand(['vm:info', '--vm', 'missing-vm']);

      expect(error?.message).to.equal('vm does not exist.');
    });
  });

  describe('vm:start', () => {
    const start = ['vm:start', '--vm', 'stopped-vm', '--detach'];

    it('sends the start signal', async () => {
      expectVms();
      expectPower('vm-2', 'start').reply(200);

      const { stderr, error } = await runCommand(start);

      expect(error).to.equal(undefined);
      expect(stderr).to.include(
        'Start signal has been sent for vm "stopped-vm"',
      );
    });

    it('throws an error if the vm is not found', async () => {
      expectVms();
      expectPower('vm-2', 'start').reply(404);

      const { error } = await runCommand(start);

      expect(error?.message).to.equal('Could not find the vm.');
    });

    it('throws an error if the vm id is invalid', async () => {
      expectVms();
      expectPower('vm-2', 'start').reply(400);

      const { error } = await runCommand(start);

      expect(error?.message).to.equal('Invalid vm ID.');
    });
  });

  describe('vm:stop', () => {
    const stop = ['vm:stop', '--vm', 'running-vm', '--detach'];

    it('sends the shutdown signal', async () => {
      expectVms();
      expectPower('vm-1', 'shutdown').reply(200);

      const { stderr, error } = await runCommand(stop);

      expect(error).to.equal(undefined);
      expect(stderr).to.include(
        'Shutdown signal has been sent for VM "running-vm"',
      );
    });

    it('sends the stop signal with --force', async () => {
      expectVms();
      expectPower('vm-1', 'stop').reply(200);

      const { stderr } = await runCommand([...stop, '--force']);

      expect(stderr).to.include(
        'Stop signal has been sent for VM "running-vm"',
      );
    });

    it('throws an error if the vm is not found', async () => {
      expectVms();
      expectPower('vm-1', 'shutdown').reply(404);

      const { error } = await runCommand(stop);

      expect(error?.message).to.equal('Could not find the vm.');
    });

    it('throws an error if the vm id is invalid', async () => {
      expectVms();
      expectPower('vm-1', 'shutdown').reply(400);

      const { error } = await runCommand(stop);

      expect(error?.message).to.equal('Invalid vm ID.');
    });
  });

  describe('vm:restart', () => {
    const restart = ['vm:restart', '--vm', 'running-vm', '--detach'];

    it('sends the reboot signal', async () => {
      expectVms();
      expectPower('vm-1', 'reboot').reply(200);

      const { stderr, error } = await runCommand(restart);

      expect(error).to.equal(undefined);
      expect(stderr).to.include(
        'Restart signal has been sent for vm "running-vm"',
      );
    });

    it('throws an error if the vm id is invalid', async () => {
      expectVms();
      expectPower('vm-1', 'reboot').reply(400);

      const { error } = await runCommand(restart);

      expect(error?.message).to.equal('Invalid vm ID.');
    });

    it('throws the response error for other failures', async () => {
      expectVms();
      expectPower('vm-1', 'reboot').reply(404);

      const { error } = await runCommand(restart);

      expect(error?.message).to.equal('Response code 404 (Not Found)');
    });
  });

  describe('vm:delete', () => {
    const remove = ['vm:delete', '--vm', 'running-vm', '--force'];

    it('deletes the vm with --force', async () => {
      expectVms();
      api.delete('/vm/vm-1').query({ teamID: '' }).reply(200);

      const { stdout, error } = await runCommand(remove);

      expect(error).to.equal(undefined);
      expect(stdout).to.equal('vm "running-vm" deleted.\n');
    });

    it('deletes the vm after confirmation', async () => {
      sinon.stub(VmDelete.prototype, 'confirm').resolves(true);
      expectVms();
      api.delete('/vm/vm-1').query({ teamID: '' }).reply(200);

      const { stdout, error } = await runCommand([
        'vm:delete',
        '--vm',
        'running-vm',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.equal('vm "running-vm" deleted.\n');
    });

    it('does not delete the vm without confirmation', async () => {
      sinon.stub(VmDelete.prototype, 'confirm').resolves(false);
      expectVms();

      // No DELETE is expected, so nock would fail an unexpected request.
      const { stdout, error } = await runCommand([
        'vm:delete',
        '--vm',
        'running-vm',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.equal('');
    });

    it('throws an error if the vm id is invalid', async () => {
      expectVms();
      api.delete('/vm/vm-1').query({ teamID: '' }).reply(400);

      const { error } = await runCommand(remove);

      expect(error?.message).to.equal('Invalid vm ID.');
    });
  });

  describe('vm:create', () => {
    const expectCreate = () =>
      api
        .post('/vm', { OS: 'ubuntu-22.04', name: 'new-vm', plan: 'g1' })
        .query({ teamID: '' });

    beforeEach(() => {
      sinon.stub(VmCreate.prototype, 'getOperatingSystems').resolves({} as any);
      sinon.stub(VmCreate.prototype, 'promptVMName').resolves('new-vm');
      sinon
        .stub(VmCreate.prototype, 'promptOperatingSystems')
        .resolves('ubuntu');
      sinon
        .stub(VmCreate.prototype, 'promptOperatingSystemVersions')
        .resolves('22.04');
      sinon.stub(VmCreate.prototype, 'promptPlan').resolves('g1');
      sinon.stub(VmCreate.prototype, 'promptSSHKey').resolves([]);
    });

    it('submits the vm', async () => {
      expectCreate().reply(200);

      const { stderr, error } = await runCommand(['vm:create', '--detach']);

      expect(error).to.equal(undefined);
      expect(stderr).to.include(
        'vm "new-vm" creation request submitted successfully in detach mode.',
      );
    });

    it('throws an error if the vm name is taken', async () => {
      expectCreate().reply(409);

      const { error } = await runCommand(['vm:create', '--detach']);

      expect(error?.message).to.equal(
        'A vm with this name already exists. Please choose a unique name.',
      );
    });
  });
});
