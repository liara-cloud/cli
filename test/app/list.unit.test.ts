import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import { expect } from 'chai';
import { projects } from '../fixtures/projects/fixture.ts';
import { API_TOKEN, stubGlobalConfig } from '../helpers/stubs.ts';

describe('app:list', function () {
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

  it('lists the apps with their details', async () => {
    api.get('/v1/projects').query({ teamID: '' }).reply(200, projects);

    const { stdout } = await runCommand(['app:list', '--output', 'json']);

    expect(JSON.parse(stdout)).to.deep.equal([
      {
        Name: 'proj12345',
        Platform: 'node',
        Plan: 'standard-plus-g2',
        'Feature plan': 'basic',
        Scale: '1',
        Status: 'ACTIVE',
        'Created At': '1402-7-13',
      },
      {
        Name: 'testdocker',
        Platform: 'docker',
        Plan: 'medium-g2',
        'Feature plan': 'standard',
        Scale: '1',
        Status: 'ACTIVE',
        'Created At': '1403-12-26',
      },
    ]);
  });

  it('prints a table by default', async () => {
    api.get('/v1/projects').query({ teamID: '' }).reply(200, projects);

    const { stdout } = await runCommand(['app:list']);
    const lines = stdout.trim().split('\n');

    expect(lines[0]).to.match(
      /Name\s+Platform\s+Plan\s+Feature plan\s+Scale\s+Status\s+Created at/,
    );
    expect(lines).to.have.length(4);
    expect(stdout).to.match(
      /proj12345\s+node\s+standard-plus-g2\s+basic\s+1\s+ACTIVE\s+1402-7-13/,
    );
    expect(stdout).to.match(
      /testdocker\s+docker\s+medium-g2\s+standard\s+1\s+ACTIVE\s+1403-12-26/,
    );
  });

  it('is also available as app:ls', async () => {
    api.get('/v1/projects').query({ teamID: '' }).reply(200, projects);

    const { stdout } = await runCommand(['app:ls', '--output', 'json']);

    expect(JSON.parse(stdout)).to.have.length(2);
  });

  it('authenticates with the token of the current account', async () => {
    api
      .get('/v1/projects')
      .query({ teamID: '' })
      .matchHeader('authorization', `Bearer ${API_TOKEN}`)
      .reply(200, projects);

    const { error } = await runCommand(['app:list']);

    expect(error).to.equal(undefined);
  });

  it('authenticates with --api-token over the current account', async () => {
    api
      .get('/v1/projects')
      .query({ teamID: '' })
      .matchHeader('authorization', 'Bearer flag-token')
      .reply(200, projects);

    const { error } = await runCommand([
      'app:list',
      '--api-token',
      'flag-token',
    ]);

    expect(error).to.equal(undefined);
  });

  it('throws an error if there are no apps', async () => {
    api.get('/v1/projects').query({ teamID: '' }).reply(200, { projects: [] });

    const { error } = await runCommand(['app:list']);

    expect(error?.message).to.equal(
      "Please create an app via 'liara app:create' command, first.",
    );
  });

  it('throws the response error if listing fails', async () => {
    // got retries GET requests on 5xx, so use a status it does not retry.
    api.get('/v1/projects').query({ teamID: '' }).reply(400);

    const { error } = await runCommand(['app:list']);

    expect(error?.message).to.equal('Response code 400 (Bad Request)');
  });
});
