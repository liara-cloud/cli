import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import inquirer from 'inquirer';
import { expect } from 'chai';
import { projects } from '../fixtures/projects/fixture.ts';
import { stubGlobalConfig } from '../helpers/stubs.ts';
import AppDelete from '../../src/commands/app/delete.ts';

describe('app:delete', function () {
  const api = nock('https://api.liara.ir');

  const expectDelete = (app: string) =>
    api.delete(`/v1/projects/${app}`).query({ teamID: '' });

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

  it('deletes the app after confirmation', async () => {
    sinon.stub(AppDelete.prototype, 'confirm').resolves(true);
    expectDelete('test-app').reply(200);

    const { stdout, error } = await runCommand([
      'app:delete',
      '--app',
      'test-app',
    ]);

    expect(error).to.equal(undefined);
    expect(stdout).to.equal('App test-app deleted.\n');
  });

  it('does not delete the app without confirmation', async () => {
    sinon.stub(AppDelete.prototype, 'confirm').resolves(false);

    // No DELETE is expected, so nock would fail an unexpected request.
    const { stdout, error } = await runCommand([
      'app:delete',
      '--app',
      'test-app',
    ]);

    expect(error).to.equal(undefined);
    expect(stdout).to.equal('');
  });

  it('asks for confirmation with "no" as the default', async () => {
    const prompt = sinon
      .stub(inquirer, 'prompt')
      .resolves({ confirmation: false });

    await runCommand(['app:delete', '--app', 'test-app']);

    expect(prompt.calledOnce).to.equal(true);
    expect(prompt.firstCall.args[0]).to.deep.include({
      name: 'confirmation',
      type: 'confirm',
      message: 'Are you sure you want to delete "test-app"?',
      default: false,
    });
  });

  it('prompts for the app when --app is not given', async () => {
    api.get('/v1/projects').query({ teamID: '' }).reply(200, projects);
    expectDelete('proj12345').reply(200);
    const prompt = sinon.stub(inquirer, 'prompt');
    prompt.onFirstCall().resolves({ project: 'proj12345' });
    prompt.onSecondCall().resolves({ confirmation: true });

    const { stdout } = await runCommand(['app:delete']);

    expect(prompt.firstCall.args[0])
      .to.have.property('choices')
      .that.deep.equals(['proj12345', 'testdocker']);
    expect(prompt.secondCall.args[0]).to.include({
      message: 'Are you sure you want to delete "proj12345"?',
    });
    expect(stdout).to.equal('App proj12345 deleted.\n');
  });

  for (const alias of ['delete', 'app:remove', 'app:rm']) {
    it(`is also available as ${alias}`, async () => {
      sinon.stub(AppDelete.prototype, 'confirm').resolves(true);
      expectDelete('test-app').reply(200);

      const { stdout } = await runCommand([alias, '-a', 'test-app']);

      expect(stdout).to.equal('App test-app deleted.\n');
    });
  }

  it('throws an error if the app does not exist', async () => {
    sinon.stub(AppDelete.prototype, 'confirm').resolves(true);
    expectDelete('test-app').reply(404);

    const { error } = await runCommand(['app:delete', '--app', 'test-app']);

    expect(error?.message).to.equal('Could not find the app.');
  });

  it('throws an error if another operation is running', async () => {
    sinon.stub(AppDelete.prototype, 'confirm').resolves(true);
    expectDelete('test-app').reply(409);

    const { error } = await runCommand(['app:delete', '--app', 'test-app']);

    expect(error?.message).to.equal(
      'Another operation is already running. Please wait.',
    );
  });

  it('throws an error if the app could not be deleted', async () => {
    sinon.stub(AppDelete.prototype, 'confirm').resolves(true);
    // got retries DELETE requests on 5xx, so use a status it does not retry.
    expectDelete('test-app').reply(400);

    const { error } = await runCommand(['app:delete', '--app', 'test-app']);

    expect(error?.message).to.equal(
      'Could not delete the app. Please try again.',
    );
  });
});
