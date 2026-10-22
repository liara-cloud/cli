import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import inquirer from 'inquirer';
import { expect } from 'chai';
import { projects } from '../fixtures/projects/fixture.ts';
import { stubGlobalConfig } from '../helpers/stubs.ts';

describe('app:update-port', function () {
  const api = nock('https://api.liara.ir');

  const expectUpdate = (project: string, port: number) =>
    api
      .post('/v1/projects/update-port', { port, project })
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

  it('updates the port of the app', async () => {
    expectUpdate('test-app', 8080).reply(200);

    const { stdout, error } = await runCommand([
      'app:update-port',
      '--app',
      'test-app',
      '--port',
      '8080',
    ]);

    expect(error).to.equal(undefined);
    expect(stdout).to.equal('App test-app deployed with port 8080.\n');
  });

  it('is also available as update-port', async () => {
    expectUpdate('test-app', 3000).reply(200);

    const { stdout } = await runCommand([
      'update-port',
      '-a',
      'test-app',
      '-p',
      '3000',
    ]);

    expect(stdout).to.equal('App test-app deployed with port 3000.\n');
  });

  it('prompts for the app and the port when they are not given', async () => {
    api.get('/v1/projects').query({ teamID: '' }).reply(200, projects);
    expectUpdate('testdocker', 3000).reply(200);
    const prompt = sinon.stub(inquirer, 'prompt');
    prompt.onFirstCall().resolves({ project: 'testdocker' });
    prompt.onSecondCall().callsFake((async ([question]: any[]) => ({
      port: question.filter('3000'),
    })) as any);

    const { stdout } = await runCommand(['app:update-port']);

    expect(stdout).to.equal('App testdocker deployed with port 3000.\n');
  });

  it('only accepts valid port numbers in the prompt', async () => {
    expectUpdate('test-app', 80).reply(200);
    const prompt = sinon.stub(inquirer, 'prompt').resolves({ port: 80 });

    await runCommand(['app:update-port', '--app', 'test-app']);

    const [question] = prompt.firstCall.args[0] as any[];
    const invalid = 'Please enter a valid port number (1-65535)';
    expect(question.message).to.equal('Enter the desired port:');
    expect(question.validate('80')).to.equal(true);
    expect(question.validate('65535')).to.equal(true);
    expect(question.validate('0')).to.equal(invalid);
    expect(question.validate('65536')).to.equal(invalid);
    expect(question.validate('80.5')).to.equal(invalid);
    expect(question.validate('http')).to.equal(invalid);
  });

  it('throws an error if --port is not an integer', async () => {
    const { error } = await runCommand([
      'app:update-port',
      '--app',
      'test-app',
      '--port',
      'abc',
    ]);

    expect(error?.message).to.include('Expected an integer but received: abc');
  });

  it('throws an error if the app does not exist', async () => {
    expectUpdate('test-app', 8080).reply(404);

    const { error } = await runCommand([
      'app:update-port',
      '--app',
      'test-app',
      '--port',
      '8080',
    ]);

    expect(error?.message).to.equal('Could not find the app.');
  });

  it('throws an error if another operation is running', async () => {
    expectUpdate('test-app', 8080).reply(409);

    const { error } = await runCommand([
      'app:update-port',
      '--app',
      'test-app',
      '--port',
      '8080',
    ]);

    expect(error?.message).to.equal(
      'Another operation is already running. Please wait.',
    );
  });

  it('throws an error if the port could not be updated', async () => {
    // The API answers 400 when the app is unknown.
    expectUpdate('test-app', 8080).reply(400);

    const { error } = await runCommand([
      'app:update-port',
      '--app',
      'test-app',
      '--port',
      '8080',
    ]);

    expect(error?.message).to.equal(
      'Could not deploy the app. Please try again.',
    );
  });
});
