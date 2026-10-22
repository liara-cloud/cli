import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import { expect } from 'chai';
import type { AddressInfo } from 'node:net';
import { IncomingMessage, Server, createServer } from 'node:http';
import { Duplex } from 'node:stream';
import WebSocket, { WebSocketServer } from 'ws';
import { projects } from '../fixtures/projects/fixture.ts';
import {
  API_TOKEN,
  stubGlobalConfig,
  stubProcessExit,
} from '../helpers/stubs.ts';
import AppShell from '../../src/commands/app/shell.ts';

type Upgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => void;

describe('app:shell', function () {
  const api = nock('https://api.liara.ir');
  const wss = new WebSocketServer({ noServer: true });
  let server: Server;
  let onUpgrade: Upgrade;
  let endpoints: string[];
  let stdinIsTTY: PropertyDescriptor | undefined;

  // Accepts the connection and answers the "start" message the CLI sends
  // once connected; the server only closes after it, so no timer of the
  // command outlives the test.
  const acceptAndReply =
    (reply: string, received: unknown[] = []): Upgrade =>
    (req, socket, head) =>
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.on('message', (data) => {
          received.push(JSON.parse(data.toString()));
          ws.send(reply);
          ws.close();
        });
      });

  const expectProjects = (teamID = '') =>
    api.get('/v1/projects').query({ teamID }).reply(200, projects);

  // Exits of the command happen in websocket event handlers, after
  // runCommand returned, so capture output while waiting for the exit.
  const runShell = async (args: string[]) => {
    const { exited } = stubProcessExit({ throws: false });
    const write = sinon.stub(process.stdout, 'write').returns(true);
    const consoleError = sinon.stub(console, 'error');

    const { error } = await runCommand(['app:shell', ...args]);
    const code = await exited;

    write.restore();
    consoleError.restore();

    return {
      code,
      error,
      stdout: write.args.map(([chunk]) => chunk.toString()).join(''),
      stderr: consoleError.args.map((args) => args.join(' ')).join('\n'),
    };
  };

  beforeEach(async () => {
    // Only the local websocket server below may be reached.
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    server = createServer();
    server.on('upgrade', (req, socket, head) => onUpgrade(req, socket, head));
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );

    stubGlobalConfig();
    endpoints = [];
    const { port } = server.address() as AddressInfo;
    sinon
      .stub(AppShell.prototype, 'createProxiedWebsocket')
      .callsFake((endpoint: string) => {
        endpoints.push(endpoint);
        return new WebSocket(
          endpoint.replace('wss://api.iran.liara.ir', `ws://127.0.0.1:${port}`),
        );
      });

    // Never switch the terminal running the tests into raw mode.
    stdinIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
    });
  });

  afterEach(async () => {
    if (stdinIsTTY) {
      Object.defineProperty(process.stdin, 'isTTY', stdinIsTTY);
    } else {
      delete (process.stdin as { isTTY?: boolean }).isTTY;
    }

    api.done();
    nock.cleanAll();
    nock.enableNetConnect();
    sinon.restore();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  it('runs the command in the app and prints its output', async () => {
    expectProjects();
    const received: unknown[] = [];
    onUpgrade = acceptAndReply('hello from the app\n', received);

    const { code, error, stdout, stderr } = await runShell([
      '--app',
      'proj12345',
      '--command',
      'ls',
    ]);

    expect(error).to.equal(undefined);
    expect(code).to.equal(0);
    expect(endpoints).to.deep.equal([
      `wss://api.iran.liara.ir/v1/exec?token=${API_TOKEN}&cmd=ls&project_id=proj12345&teamID=`,
    ]);
    expect(received).to.have.length(1);
    expect(received[0]).to.include({ action: 'start' });
    expect(stdout).to.equal('hello from the app\n');
    expect(stderr).to.include(
      'Not running in a terminal, cannot set raw mode.',
    );
  });

  it('runs /bin/bash by default', async () => {
    expectProjects();
    onUpgrade = acceptAndReply('');

    const { code } = await runShell(['--app', 'proj12345']);

    expect(code).to.equal(0);
    expect(new URL(endpoints[0]).searchParams.get('cmd')).to.equal('/bin/bash');
  });

  it('is also available as shell', async () => {
    expectProjects();
    onUpgrade = acceptAndReply('');
    const { exited } = stubProcessExit({ throws: false });
    sinon.stub(console, 'error');

    const { error } = await runCommand(['shell', '-a', 'proj12345']);

    expect(error).to.equal(undefined);
    expect(await exited).to.equal(0);
  });

  it('uses the app name in lowercase', async () => {
    expectProjects();
    onUpgrade = acceptAndReply('');

    const { code } = await runShell(['--app', 'PROJ12345']);

    expect(code).to.equal(0);
    expect(new URL(endpoints[0]).searchParams.get('project_id')).to.equal(
      'proj12345',
    );
  });

  it('sends the team id given by --team-id', async () => {
    expectProjects('team-1');
    onUpgrade = acceptAndReply('');

    const { code } = await runShell([
      '--app',
      'proj12345',
      '--team-id',
      'team-1',
    ]);

    expect(code).to.equal(0);
    expect(new URL(endpoints[0]).searchParams.get('teamID')).to.equal('team-1');
  });

  it('throws an error if the app is not found by the shell service', async () => {
    expectProjects();
    onUpgrade = (_req, socket) =>
      socket.end('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n');

    const { code, stderr } = await runShell(['--app', 'proj12345']);

    expect(code).to.equal(2);
    expect(stderr).to.include("app 'proj12345' not found.");
  });

  it('throws an error if the connection fails', async () => {
    expectProjects();
    onUpgrade = (_req, socket) => socket.destroy();

    const { code, stderr } = await runShell(['--app', 'proj12345']);

    expect(code).to.equal(2);
    expect(stderr).to.include('Unexpected Error: socket hang up');
  });

  it('throws an error if the app does not exist', async () => {
    expectProjects();

    const { error } = await runCommand(['app:shell', '--app', 'missing-app']);

    expect(error?.message).to.equal("app 'missing-app' not found.");
    expect(endpoints).to.deep.equal([]);
  });

  it('throws an error if the app runs on the old infrastructure', async () => {
    api
      .get('/v1/projects')
      .query({ teamID: '' })
      .reply(200, {
        projects: [{ ...projects.projects[0], network: undefined }],
      });
    stubProcessExit();

    const { error, stderr } = await runCommand([
      'app:shell',
      '--app',
      'proj12345',
    ]);

    expect(error?.message).to.equal('process.exit(1)');
    expect(endpoints).to.deep.equal([]);
    expect(stderr).to.include(
      'This version of Liara CLI no longer supports apps running on the old infrastructure.',
    );
  });
});
