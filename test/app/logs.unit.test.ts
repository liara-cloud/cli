import { runCommand } from '@oclif/test';
import nock from 'nock';
import sinon from 'sinon';
import moment from 'moment';
import { expect } from 'chai';
import { getNodeProject } from '../fixtures/projects/fixture.ts';
import { stubGlobalConfig, stubProcessExit } from '../helpers/stubs.ts';
import AppLogs from '../../src/commands/app/logs.ts';

const DAY = 86400;
const now = () => Math.floor(Date.now() / 1000);

// Log lines are [nanosecond timestamp, JSON payload] pairs.
const line = (unix: number, entry: string, type = 'stdout') => [
  `${unix}000000000`,
  JSON.stringify({ _entry: entry, type }),
];

const releases = {
  releases: [
    { _id: 'release-1', tag: 'v1' },
    { _id: 'release-2', tag: 'v2' },
  ],
};

const plans = (planID: string, bundlePlanID: string, days: number) => ({
  plans: {
    projectBundlePlans: {
      [planID]: { [bundlePlanID]: { maxLogsRetention: days } },
    },
  },
});

// CLIError output is wrapped to the terminal width.
const unwrap = (output: string) => output.replace(/\s*\n\s*›\s+/g, ' ');

describe('app:logs', function () {
  const api = nock('https://api.liara.ir');
  const app = getNodeProject.project.project_id;
  const { planID, bundlePlanID } = getNodeProject.project;

  const expectProject = (project = getNodeProject.project) => {
    api
      .get(`/v1/projects/${project.project_id}`)
      .query({ teamID: '' })
      .reply(200, { project });
  };

  const expectPlans = (days = 30, bundle = bundlePlanID) => {
    api
      .get('/v1/me')
      .query({ teamID: '' })
      .reply(200, plans(planID, bundle, days));
  };

  const expectReleases = () => {
    api
      .get(`/v1/projects/${app}/releases`)
      .query({ page: '1', count: '100', teamID: '' })
      .reply(200, releases);
  };

  const expectLogs = (
    data: unknown[],
    query: (q: Record<string, string>) => boolean = () => true,
  ) =>
    api
      .get(`/v2/projects/${app}/logs`)
      .query(
        (q) =>
          q.direction === 'forward' &&
          q.teamID === '' &&
          query(q as Record<string, string>),
      )
      .reply(200, { data });

  beforeEach(() => {
    nock.disableNetConnect();
    stubGlobalConfig();
    sinon.stub(AppLogs.prototype, 'sleep').resolves();
  });

  afterEach(() => {
    api.done();
    nock.cleanAll();
    nock.enableNetConnect();
    sinon.restore();
  });

  it('prints the logs in order until there are no new lines', async () => {
    const t = now() - 60;
    expectProject();
    expectPlans();
    expectLogs([
      {
        metaData: { releaseId: 'release-1' },
        values: [line(t + 2, 'third'), line(t + 3, 'fourth')],
      },
      {
        metaData: { releaseId: 'release-2' },
        values: [line(t, 'first'), line(t + 1, 'second', 'stderr')],
      },
    ]);
    expectReleases();
    expectReleases();
    expectLogs([]);

    const { stdout, stderr, error } = await runCommand([
      'app:logs',
      '--app',
      app,
    ]);

    expect(error).to.equal(undefined);
    expect(stdout).to.equal('first\nthird\nfourth\n');
    expect(stderr).to.equal('second\n');
  });

  it('is also available as logs', async () => {
    expectProject();
    expectPlans();
    expectLogs([]);

    const { error } = await runCommand(['logs', '-a', app]);

    expect(error).to.equal(undefined);
  });

  it('prefixes the lines with the release tag and time with --timestamps', async () => {
    const t = now() - 60;
    expectProject();
    expectPlans();
    expectLogs([
      { metaData: { releaseId: 'release-1' }, values: [line(t, 'tagged')] },
      { metaData: { releaseId: 'gone' }, values: [line(t + 1, 'untagged')] },
    ]);
    expectReleases();
    expectReleases();
    expectLogs([]);

    const { stdout, error } = await runCommand([
      'app:logs',
      '--app',
      app,
      '--timestamps',
    ]);

    const time = (unix: number) =>
      moment.unix(unix).format('YYYY-MM-DDTHH:mm:ss');
    expect(error).to.equal(undefined);
    expect(stdout).to.equal(
      `v1 | ${time(t)} | tagged\nunknown | ${time(t + 1)} | untagged\n`,
    );
  });

  it('colors access logs with --colorize', async () => {
    const t = now() - 60;
    expectProject();
    expectPlans();
    expectLogs([
      {
        metaData: { releaseId: 'release-1' },
        values: [line(t, '192.168.1.10 - GET /index.html')],
      },
    ]);
    expectReleases();
    expectLogs([]);

    const { stdout, error } = await runCommand(
      ['app:logs', '--app', app, '--colorize'],
      undefined,
      { stripAnsi: false },
    );

    expect(error).to.equal(undefined);
    expect(stdout).to.include('\x1B[0;36m192.168.1.10\x1B[0m');
    expect(stdout).to.include('\x1B[1;34mGET\x1B[0m');
  });

  it('fetches the logs from the max retention period by default', async () => {
    expectProject();
    expectPlans(30);
    expectLogs([], (q) => Math.abs(Number(q.start) - (now() - 30 * DAY)) < 60);

    const { error } = await runCommand(['app:logs', '--app', app]);

    expect(error).to.equal(undefined);
  });

  it('fetches the logs since the time given by --since', async () => {
    expectProject();
    expectPlans();
    expectLogs([], (q) => Math.abs(Number(q.start) - (now() - 3600)) < 60);

    const { error } = await runCommand([
      'app:logs',
      '--app',
      app,
      '--since',
      // runCommand joins and re-splits the args, so quote values with spaces.
      '"1 hour ago"',
    ]);

    expect(error).to.equal(undefined);
  });

  it('fetches only the last lines once with --last-lines', async () => {
    const t = now() - 60;
    expectProject();
    expectPlans();
    expectLogs(
      [{ metaData: { releaseId: 'release-1' }, values: [line(t, 'last')] }],
      (q) => q.last_lines === 'true',
    );
    expectReleases();

    const { stdout, error } = await runCommand([
      'app:logs',
      '--app',
      app,
      '--last-lines',
    ]);

    expect(error).to.equal(undefined);
    expect(stdout).to.equal('last\n');
  });

  it('fetches the logs of the release given by --release', async () => {
    const t = now() - 60;
    expectProject();
    expectPlans();
    expectReleases();
    expectLogs(
      [{ metaData: { releaseId: 'release-2' }, values: [line(t, 'from v2')] }],
      (q) => q.releaseId === 'release-2',
    );
    expectLogs([], (q) => q.releaseId === 'release-2');

    const { stdout, error } = await runCommand([
      'app:logs',
      '--app',
      app,
      '--release',
      'V2',
    ]);

    expect(error).to.equal(undefined);
    expect(stdout).to.equal('from v2\n');
  });

  it('throws an error if the release does not exist', async () => {
    stubProcessExit();
    expectProject();
    expectPlans();
    expectReleases();

    const { stderr, error } = await runCommand([
      'app:logs',
      '--app',
      app,
      '--release',
      'v9',
    ]);

    expect(error?.message).to.equal('process.exit(2)');
    expect(unwrap(stderr)).to.include(
      'Release "v9" not found. Please check the release tag and try again.',
    );
  });

  it('uses the app name in lowercase', async () => {
    expectProject();
    expectPlans();
    expectLogs([]);

    const { error } = await runCommand([
      'app:logs',
      '--app',
      app.toUpperCase(),
    ]);

    expect(error).to.equal(undefined);
  });

  it('uses the app from liara.json when --app is not given', async () => {
    sinon.stub(AppLogs.prototype, 'readProjectConfig').returns({ app });
    expectProject();
    expectPlans();
    expectLogs([]);

    const { error } = await runCommand(['app:logs']);

    expect(error).to.equal(undefined);
  });

  for (const [bundle, days, since, message] of [
    [
      'free',
      1 / 24,
      '2 hours ago',
      'On the Free plan, you can only view logs from the past 1 hour. Please upgrade your feature bundle plan to access older logs.',
    ],
    [
      'standard',
      30,
      '40 days ago',
      'On the Standard plan, you can only view logs from the past 30 days. Please upgrade your feature bundle plan to access older logs.',
    ],
    [
      'pro',
      90,
      '100 days ago',
      'Log retention limit reached. Please upgrade your feature bundle plan to access more logs.',
    ],
  ] as const) {
    it(`throws an error if --since is beyond the retention of the ${bundle} plan`, async () => {
      stubProcessExit();
      expectProject({ ...getNodeProject.project, bundlePlanID: bundle });
      expectPlans(days, bundle);

      const { stderr, error } = await runCommand([
        'app:logs',
        '--app',
        app,
        '--since',
        `"${since}"`,
      ]);

      expect(error?.message).to.equal('process.exit(2)');
      expect(unwrap(stderr)).to.include(message);
    });
  }

  it('throws an error if the app runs on the old infrastructure', async () => {
    stubProcessExit();
    expectProject({ ...getNodeProject.project, network: undefined });

    const { stderr, error } = await runCommand(['app:logs', '--app', app]);

    expect(error?.message).to.equal('process.exit(1)');
    expect(stderr).to.include(
      'This version of Liara CLI no longer supports apps running on the old infrastructure.',
    );
  });

  it('throws the response error if the app does not exist', async () => {
    api.get(`/v1/projects/${app}`).query({ teamID: '' }).reply(404);

    const { error } = await runCommand(['app:logs', '--app', app]);

    expect(error?.message).to.equal('Response code 404 (Not Found)');
  });

  it('throws an error if the logs of the app are not found', async () => {
    stubProcessExit();
    expectProject();
    expectPlans();
    api.get(`/v2/projects/${app}/logs`).query(true).reply(404);

    const { stderr, error } = await runCommand(['app:logs', '--app', app]);

    expect(error?.message).to.equal('process.exit(2)');
    expect(stderr).to.include('App not found.');
  });

  it('throws an error if fetching the logs fails without a response', async () => {
    stubProcessExit();
    expectProject();
    expectPlans();
    api
      .get(`/v2/projects/${app}/logs`)
      .query(true)
      .replyWithError('socket hang up');

    const { stderr, error } = await runCommand(['app:logs', '--app', app]);

    expect(error?.message).to.equal('process.exit(2)');
    expect(unwrap(stderr)).to.include(
      'We encountered an issue and were unable to retrieve the logs.',
    );
  });

  it('throws an error if the logs could not be fetched', async () => {
    stubProcessExit();
    expectProject();
    expectPlans();
    // got retries GET requests on 5xx, so use a status it does not retry.
    api.get(`/v2/projects/${app}/logs`).query(true).reply(400, 'bad request');

    const { stderr, error } = await runCommand(['app:logs', '--app', app]);

    expect(error?.message).to.equal('process.exit(2)');
    expect(unwrap(stderr)).to.include(
      'We encountered an issue and were unable to retrieve the logs.',
    );
  });
});
