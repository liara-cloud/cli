import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import inquirer from 'inquirer';
import { expect } from 'chai';
import { projects } from '../fixtures/projects/fixture.ts';
import { stubGlobalConfig } from '../helpers/stubs.ts';

// restart, start and stop share the same flow, only the request differs.
const actions = [
  {
    command: 'app:restart',
    alias: 'restart',
    action: 'restart',
    body: undefined,
    done: 'restarted',
    verb: 'restart',
  },
  {
    command: 'app:start',
    alias: 'start',
    action: 'scale',
    body: { scale: 1 },
    done: 'started',
    verb: 'start',
  },
  {
    command: 'app:stop',
    alias: 'stop',
    action: 'scale',
    body: { scale: 0 },
    done: 'stopped',
    verb: 'stop',
  },
];

for (const { command, alias, action, body, done, verb } of actions) {
  describe(command, function () {
    const api = nock('https://api.liara.ir');

    const expectAction = (app: string) =>
      api
        .post(`/v1/projects/${app}/actions/${action}`, body)
        .query({ teamID: '' });

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

    it(`${verb}s the app given by --app`, async () => {
      expectAction('test-app').reply(200);

      const { stdout, error } = await runCommand([
        command,
        '--app',
        'test-app',
      ]);

      expect(error).to.equal(undefined);
      expect(stdout).to.equal(`App test-app ${done}.\n`);
    });

    it(`is also available as ${alias}`, async () => {
      expectAction('test-app').reply(200);

      const { stdout } = await runCommand([alias, '-a', 'test-app']);

      expect(stdout).to.equal(`App test-app ${done}.\n`);
    });

    it('prompts for the app when --app is not given', async () => {
      api.get('/v1/projects').query({ teamID: '' }).reply(200, projects);
      expectAction('testdocker').reply(200);
      const prompt = sinon
        .stub(inquirer, 'prompt')
        .resolves({ project: 'testdocker' });

      const { stdout } = await runCommand([command]);

      expect(prompt.firstCall.args[0]).to.include({
        name: 'project',
        type: 'list',
        message: 'Please select an app:',
      });
      expect(prompt.firstCall.args[0])
        .to.have.property('choices')
        .that.deep.equals(['proj12345', 'testdocker']);
      expect(stdout).to.equal(`App testdocker ${done}.\n`);
    });

    it('throws an error if the app does not exist', async () => {
      expectAction('test-app').reply(404);

      const { error } = await runCommand([command, '--app', 'test-app']);

      expect(error?.message).to.equal('Could not find the app.');
    });

    it('throws an error if another operation is running', async () => {
      expectAction('test-app').reply(409);

      const { error } = await runCommand([command, '--app', 'test-app']);

      expect(error?.message).to.equal(
        'Another operation is already running. Please wait.',
      );
    });

    it(`throws an error if the app could not be ${done}`, async () => {
      expectAction('test-app').reply(500);

      const { error } = await runCommand([command, '--app', 'test-app']);

      expect(error?.message).to.equal(
        `Could not ${verb} the app. Please try again.`,
      );
    });
  });
}
