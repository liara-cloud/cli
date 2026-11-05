import { expect } from 'chai';
import sinon from 'sinon';
import { runCommand } from '@oclif/test';
import deploy from '../../src/commands/deploy.ts';
import Logs from '../../src/commands/app/logs.ts';
import nock from 'nock';
import fs from 'fs-extra';
import {
  getNodeProject,
  getDockerProject,
} from '../fixtures/projects/fixture.ts';
import { stubGlobalConfig, stubProcessExit } from '../helpers/stubs.ts';

describe('deploy', () => {
  const api = nock('https://api.liara.ir');

  const mockBundlePlan = (bundlePlan: object) =>
    api
      .get('/v1/me')
      .query({ teamID: '' })
      .reply(200, {
        plans: {
          projectBundlePlans: {
            [getNodeProject.project.planID]: {
              [getNodeProject.project.bundlePlanID]: bundlePlan,
            },
          },
        },
      });

  // For tests where loading the plans would be an extra request to a heavy
  // endpoint. Call expectPlansNotLoaded() at the end of the test.
  const mockUnexpectedPlans = () =>
    api.get('/v1/me').query(true).reply(200, {});

  const expectPlansNotLoaded = () => {
    expect(api.pendingMocks().join()).to.contain('/v1/me');
    nock.cleanAll();
  };

  let getConfigs: sinon.SinonStub;
  beforeEach(() => {
    stubGlobalConfig();
    getConfigs = sinon.stub(deploy.prototype, 'getMergedConfig');
  });
  afterEach(() => {
    sinon.restore();
    Logs.maxLogsRetention = undefined;
    Logs.releaseId = undefined;
  });
  it('should thorw an error when project path is empty and image flag is specified', async () => {
    fs.mkdirSync('test/fixtures/empty-project');
    getConfigs.returns({ path: 'test/fixtures/empty-project' });

    const { error } = await runCommand(['deploy']);
    fs.rmdirSync('test/fixtures/empty-project');
    expect(error?.message).to.equal('Directory is empty!');
  });

  it('should throw an error if healthcheck in specefied but healthcheck command is not', async () => {
    getConfigs.returns({ healthCheck: {}, path: 'test/fixtures/nodejs-app' });

    const { error } = await runCommand(['deploy']);

    expect(error?.message).to.equal(
      '`command` field in healthCheck is required.',
    );
  });

  it('should throw an error if cache config is not a boolean', async () => {
    getConfigs.returns({
      build: {
        cache: 'string',
      },
      path: 'test/fixtures/nodejs-app',
    });

    const { error } = await runCommand(['deploy']);

    expect(error?.message).to.equal(
      '`cache` parameter field must be a boolean.',
    );
  });

  it('should throw an error if platform is node and start command is not provided in package.json.', async () => {
    getConfigs.returns({
      platform: 'node',
      path: 'test/fixtures/nodejs-app',
      app: getNodeProject.project.project_id,
    });

    api
      .get(`/v1/projects/${getNodeProject.project.project_id}`)
      .query({ teamID: '' })
      .reply(200, getNodeProject);

    const { stdout } = await runCommand(['deploy', '--debug']);
    expect(stdout).to.contains(
      `Error: A NodeJS app must be runnable with 'npm start'`,
    );
  });

  it('should create a release if platform is docker.', async () => {
    getConfigs.returns({
      path: 'test/fixtures/docker-platform/',
      app: 'testdocker',
      image: 'getmeili/meilisearch:v0.28',
      port: 7700,
      disks: [{ name: 'data', mountTo: '/meili_data' }],
      platform: 'docker',
      detach: true,
      'no-app-logs': false,
      args: undefined,
    });
    api
      .get('/v1/projects/testdocker')
      .query({ teamID: '' })
      .reply(200, getDockerProject);

    api
      .post('/v2/projects/testdocker/releases', {
        build: {
          cache: true,
          args: undefined,
          dockerfile: undefined,
          location: undefined,
        },
        cron: undefined,
        args: undefined,
        port: 7700,
        type: 'docker',
        message: undefined,
        disks: [
          {
            name: 'data',
            mountTo: '/meili_data',
          },
        ],
        image: 'getmeili/meilisearch:v0.28',
      })
      .query({ teamID: '' })
      .reply(200, { releaseID: '6rqwrqwrqweBwd34124314' });

    const { stdout } = await runCommand([
      'deploy',
      '--debug',
      '--detach',
      '--platform',
      'docker',
      '--path',
      'test/fixtures/docker-platform',
    ]);

    expect(stdout).to.match(/Disks:\s+data -> \/meili_data/);
    expect(stdout).to.match(
      /\[debug\] \[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] Using Build Cache: Enabled/,
    );
    expect(stdout).to.contain('App: testdocker');
    expect(stdout).to.contain('Path: test/fixtures/docker-platform/');
    expect(stdout).to.contain('Platform: docker');
    expect(stdout).to.contain('Port: 7700');
    expect(stdout).to.contain('Deployment created successfully.');
  });

  it('should throw the source size error when the upload is too large.', async () => {
    getConfigs.returns({
      path: 'test/fixtures/simple-gitignore',
      app: getNodeProject.project.project_id,
      platform: 'static',
      detach: true,
    });
    api
      .get(`/v1/projects/${getNodeProject.project.project_id}`)
      .query({ teamID: '' })
      .reply(200, getNodeProject);
    // A proxy answers 413 with an HTML page, not JSON.
    api
      .post(`/v2/projects/${getNodeProject.project.project_id}/sources`)
      .query({ teamID: '' })
      .reply(413, '<html><h1>413 Request Entity Too Large</h1></html>');

    const { error } = await runCommand(['deploy', '--detach']);

    expect(error?.message).to.equal(
      'Maximum source size limit reached. Please reduce your source code size.',
    );
  });

  describe('when the release finishes', () => {
    const app = getNodeProject.project.project_id;
    const defaultUrl = `https://${app}.liara.run`;
    const domainsPage = `https://console.liara.ir/apps/${app}/domains`;

    const domain = (name: string, overrides = {}) => ({
      name,
      status: 'ACTIVE',
      certificatesStatus: 'ACTIVE',
      ...overrides,
    });

    const mockProject = (overrides = {}) =>
      api
        .get(`/v1/projects/${app}`)
        .query({ teamID: '' })
        .reply(200, { project: { ...getNodeProject.project, ...overrides } });

    const mockDomains = (domains: object[]) =>
      api
        .get('/v1/domains')
        .query({ project: app, teamID: '' })
        .reply(200, { domains });

    const mockFirstRelease = (createdAt: string) => {
      api
        .get(`/v1/projects/${app}/releases`)
        .query({ page: 1, count: 1, teamID: '' })
        .reply(200, { total: 3, releases: [] });
      api
        .get(`/v1/projects/${app}/releases`)
        .query({ page: 3, count: 1, teamID: '' })
        .reply(200, { total: 3, releases: [{ createdAt }] });
    };

    beforeEach(() => {
      nock.disableNetConnect();
      sinon
        .stub(deploy.prototype, 'deploy')
        .resolves({ releaseID: 'release-id' } as any);
    });

    afterEach(() => {
      api.done();
      nock.cleanAll();
      nock.enableNetConnect();
    });

    describe('successfully', () => {
      beforeEach(() => {
        getConfigs.returns({
          path: 'test/fixtures/docker-platform',
          app,
          image: 'nginx',
          port: 80,
        });
        sinon.stub(deploy.prototype, 'showReleaseLogs').resolves();
        sinon.stub(Logs, 'run').resolves();
      });

      it('shows the active domains instead of an expired subdomain', async () => {
        mockProject({ defaultSubdomainExpired: true });
        mockDomains([domain('example.com')]);

        const { stdout, stderr } = await runCommand(['deploy']);

        expect(stdout).to.contain('https://example.com');
        expect(stdout).not.to.contain('liara.run');
        expect(stderr).not.to.contain('Warning');
      });

      it('warns instead of showing a url when the subdomain expired and no domain is active', async () => {
        mockProject({ defaultSubdomainExpired: true });
        mockDomains([
          domain('pending.example.com', {
            status: 'PENDING',
            certificatesStatus: 'PENDING',
          }),
        ]);

        const { stdout, stderr, error } = await runCommand(['deploy']);

        expect(error).to.equal(undefined);
        expect(stdout).to.contain('Deployment finished successfully.');
        expect(stdout).not.to.contain('Open up the url');
        expect(stdout).not.to.contain('liara.run');
        expect(stdout).not.to.contain('pending.example.com');
        expect(stderr).to.contain('expired');
        expect(stderr).to.contain(domainsPage);
      });

      it('shows an expired subdomain the project keeps', async () => {
        mockProject({
          defaultSubdomainExpired: true,
          keepDefaultSubdomain: true,
        });
        mockDomains([]);

        const { stdout, stderr } = await runCommand(['deploy']);

        expect(stdout).to.contain(defaultUrl);
        expect(stderr).not.to.contain('Warning');
      });

      it('shows the domains first, then a subdomain that is still valid', async () => {
        mockProject();
        mockDomains([domain('old.example.com'), domain('new.example.com')]);

        const { stdout, stderr } = await runCommand(['deploy']);

        const urls = stdout.match(/https?:\/\/\S+/g);
        expect(urls).to.deep.equal([
          'https://new.example.com',
          'https://old.example.com',
          defaultUrl,
        ]);
        expect(stderr).not.to.contain('Warning');
      });

      it('uses http for a domain without an active certificate', async () => {
        mockProject();
        mockDomains([domain('example.com', { certificatesStatus: 'PENDING' })]);

        const { stdout } = await runCommand(['deploy']);

        expect(stdout).to.contain('http://example.com');
      });

      it('does not show a disabled subdomain', async () => {
        mockProject({ defaultSubdomain: false });
        mockDomains([]);

        const { stdout, stderr } = await runCommand(['deploy']);

        expect(stdout).not.to.contain('liara.run');
        expect(stderr).to.contain('disabled');
        expect(stderr).to.contain(domainsPage);
      });

      it('uses the iran subdomain for an app without a network', async () => {
        mockProject({ network: undefined });
        mockDomains([]);
        mockFirstRelease('2026-01-01T00:00:00.000Z');

        const { stdout } = await runCommand(['deploy']);

        expect(stdout).to.contain(`https://${app}.iran.liara.run`);
      });

      it('warns that a subdomain will expire when no domain is active', async () => {
        mockProject();
        mockDomains([]);
        mockFirstRelease('2026-09-01T00:00:00.000Z');

        const { stdout, stderr } = await runCommand(['deploy']);

        expect(stdout).to.contain(defaultUrl);
        expect(stderr).to.contain('one week');
        expect(stderr).to.contain(domainsPage);
      });

      it('does not warn about expiry for an app first deployed before the rollout', async () => {
        mockProject();
        mockDomains([]);
        mockFirstRelease('2026-01-01T00:00:00.000Z');

        const { stdout, stderr } = await runCommand(['deploy']);

        expect(stdout).to.contain(defaultUrl);
        expect(stderr).not.to.contain('Warning');
      });

      it('still shows the url when the first release can not be loaded', async () => {
        mockProject();
        mockDomains([]);
        api
          .get(`/v1/projects/${app}/releases`)
          .query({ page: 1, count: 1, teamID: '' })
          .reply(403);

        const { stdout, stderr, error } = await runCommand(['deploy']);

        expect(error).to.equal(undefined);
        expect(stdout).to.contain(defaultUrl);
        expect(stderr).not.to.contain('Warning');
      });

      it('does not fail the deployment when the domains can not be loaded', async () => {
        mockProject();
        api.get('/v1/domains').query({ project: app, teamID: '' }).reply(403);

        const { stdout, stderr, error } = await runCommand(['deploy']);

        expect(error).to.equal(undefined);
        expect(stdout).to.contain('Deployment finished successfully.');
        expect(stdout).to.contain('Reading app logs...');
        expect(stderr).to.contain(domainsPage);
      });

      it('passes the log retention of the bundle plan to the app logs', async () => {
        mockProject();
        mockDomains([domain('example.com')]);
        mockBundlePlan({ maxLogsRetention: 0.05 });

        await runCommand(['deploy']);

        expect(Logs.maxLogsRetention).to.equal(0.05);
      });

      it('lets the app logs load the plans if they could not be loaded', async () => {
        mockProject();
        mockDomains([domain('example.com')]);
        api.get('/v1/me').query({ teamID: '' }).reply(403);

        await runCommand(['deploy']);

        expect(Logs.maxLogsRetention).to.equal(undefined);
      });

      it('shows the logs of the new release from before it was created', async () => {
        let releaseCreatedAt = 0;
        (deploy.prototype.deploy as sinon.SinonStub).callsFake(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          releaseCreatedAt = Date.now();
          return { releaseID: 'release-id' };
        });
        mockProject();
        mockDomains([domain('example.com')]);

        await runCommand(['deploy']);

        const args = (Logs.run as sinon.SinonStub).firstCall
          .args[0] as string[];
        const since = Date.parse(args[args.indexOf('--since') + 1]);

        expect(Logs.releaseId).to.equal('release-id');
        expect(since).to.be.below(releaseCreatedAt);
        expect(args).not.to.include('--debug');
      });

      it('passes --debug on to the app logs', async () => {
        mockProject();
        mockDomains([domain('example.com')]);

        await runCommand(['deploy', '--debug']);

        expect((Logs.run as sinon.SinonStub).firstCall.args[0]).to.include(
          '--debug',
        );
      });

      // The GitHub Actions workflow in the docs deploys with this flag, so the
      // job has to finish here instead of following the logs.
      it('exits without reading the app logs with --no-app-logs', async () => {
        const { stub: exit } = stubProcessExit();
        mockProject();
        mockDomains([domain('example.com')]);

        await runCommand(['deploy', '--no-app-logs']);

        expect(exit.firstCall.args).to.deep.equal([0]);
        expect((Logs.run as sinon.SinonStub).called).to.equal(false);
        expect(Logs.releaseId).to.equal(undefined);
      });

      it('does not load the plans with --no-app-logs', async () => {
        stubProcessExit({ throws: false });
        mockProject();
        mockDomains([domain('example.com')]);
        mockUnexpectedPlans();

        await runCommand(['deploy', '--no-app-logs']);

        expectPlansNotLoaded();
      });

      it('does not load the plans for an app on the old infrastructure', async () => {
        mockProject({ network: undefined });
        mockDomains([domain('example.com')]);
        mockUnexpectedPlans();

        await runCommand(['deploy']);

        expectPlansNotLoaded();
      });
    });

    describe('unsuccessfully', () => {
      const mockBuildLogs = (release: object) => {
        api
          .get('/v1/releases/release-id')
          .query({ teamID: '' })
          .reply(200, { release: {} });
        api
          .get('/v2/releases/release-id/build-logs')
          .query(true)
          .reply(200, { release, buildOutput: [] });
      };

      beforeEach(() => {
        getConfigs.returns({
          path: 'test/fixtures/simple-gitignore',
          app,
          platform: 'static',
        });
        mockProject();
      });

      it('shows why a build release failed', async () => {
        mockBuildLogs({ state: 'FAILED', failReason: 'disk_not_found media' });

        const { error } = await runCommand(['deploy']);

        expect(error?.message).to.equal('Could not find disk `media`.');
      });

      it('shows why an image release failed', async () => {
        getConfigs.returns({
          path: 'test/fixtures/docker-platform',
          app,
          image: 'nginx',
          port: 80,
        });
        api
          .get('/v1/releases/release-id')
          .query({ teamID: '' })
          .reply(200, {
            release: { state: 'FAILED', failReason: 'IMAGE_NOT_FOUND' },
          });

        const { error } = await runCommand(['deploy']);

        expect(error?.message).to.equal(
          'Could not find the image. Please make sure it is accessible.',
        );
      });

      it('explains the options when the build times out', async () => {
        mockBuildLogs({ state: 'TIMEDOUT' });

        const { error } = await runCommand(['deploy']);

        expect(error?.message).to.contain('Build timed out.');
        expect(error?.message).not.to.contain('20 minutes');
        expect(error?.message).to.contain(
          `https://console.liara.ir/apps/${app}/resize`,
        );
      });

      it('shows the build time the bundle plan allows', async () => {
        mockBundlePlan({ buildTimeout: 15 });
        mockBuildLogs({ state: 'TIMEDOUT' });

        const { error } = await runCommand(['deploy']);

        expect(error?.message).to.contain(
          'It took longer than the 15 minutes your feature bundle plan allows.',
        );
      });
    });

    it('explains every known fail reason', () => {
      const { parseFailReason } = deploy.prototype;

      for (const reason of [
        'APP_CRASHED',
        'DISK_IS_NOT_DIRECTORY',
        'ENTRYPOINT_NOT_FOUND',
        'IMAGE_NOT_FOUND',
      ]) {
        expect(parseFailReason(reason)).not.to.contain(reason);
      }

      expect(parseFailReason('some other reason')).to.equal(
        'some other reason',
      );
    });
  });

  describe('before creating the release', () => {
    const app = getNodeProject.project.project_id;

    const mockUpload = () =>
      api
        .post(`/v2/projects/${app}/sources`)
        .query({ teamID: '' })
        .reply(200, { sourceID: 'source-id' });

    const mockRelease = () =>
      api
        .post(`/v2/projects/${app}/releases`)
        .query({ teamID: '' })
        .reply(200, { releaseID: 'release-id' });

    beforeEach(() => {
      nock.disableNetConnect();
      getConfigs.returns({
        path: 'test/fixtures/simple-gitignore',
        app,
        platform: 'static',
      });
      api
        .get(`/v1/projects/${app}`)
        .query({ teamID: '' })
        .reply(200, getNodeProject);
    });

    afterEach(() => {
      api.done();
      nock.cleanAll();
      nock.enableNetConnect();
    });

    describe('source size', () => {
      const MB = 1024 * 1024;

      // Reports the archive as this size, without having to build a huge one.
      const stubSourceSize = (size: number) => {
        const { statSync } = fs;
        sinon
          .stub(fs, 'statSync')
          .callsFake(((file: string) =>
            file.endsWith('.tar.gz') ? { size } : statSync(file)) as any);
      };

      describe('with --detach', () => {
        it('rejects a source over 256MB without uploading it', async () => {
          stubSourceSize(256 * MB + 1);

          const { error } = await runCommand(['deploy', '--detach']);

          expect(error?.message).to.equal(
            'The maximum source size is 256MB. Please reduce your source code size.',
          );
        });

        it('uploads a source of exactly 256MB', async () => {
          stubSourceSize(256 * MB);
          mockUpload();
          mockRelease();

          const { stdout } = await runCommand(['deploy', '--detach']);

          expect(stdout).to.contain('Deployment created successfully.');
        });

        it('does not load the plans', async () => {
          mockUnexpectedPlans();
          mockUpload();
          mockRelease();

          await runCommand(['deploy', '--detach']);

          expectPlansNotLoaded();
        });
      });

      describe('when the app logs will load the plans anyway', () => {
        beforeEach(() => {
          sinon.stub(deploy.prototype, 'showBuildLogs').resolves();
          sinon.stub(deploy.prototype, 'logAppUrls').resolves();
          sinon.stub(Logs, 'run').resolves();
        });

        it('rejects a source over the limit of the bundle plan', async () => {
          mockBundlePlan({ maxSourceSize: 128 });
          stubSourceSize(128 * MB + 1);

          const { error } = await runCommand(['deploy']);

          expect(error?.message).to.equal(
            'The maximum source size is 128MB. Please reduce your source code size or consider upgrading your feature bundle plan.',
          );
        });

        it('uploads a source of exactly the limit of the bundle plan', async () => {
          mockBundlePlan({ maxSourceSize: 128 });
          stubSourceSize(128 * MB);
          mockUpload();
          mockRelease();

          const { stdout, error } = await runCommand(['deploy']);

          expect(error).to.equal(undefined);
          expect(stdout).to.contain('Deployment finished successfully.');
        });

        it('allows more than 256MB if the bundle plan does', async () => {
          mockBundlePlan({ maxSourceSize: 512 });
          stubSourceSize(300 * MB);
          mockUpload();
          mockRelease();

          const { error } = await runCommand(['deploy']);

          expect(error).to.equal(undefined);
        });

        it('names the limit of the bundle plan when the API rejects the size', async () => {
          mockBundlePlan({ maxSourceSize: 128 });
          api
            .post(`/v2/projects/${app}/sources`)
            .query({ teamID: '' })
            .reply(413, '<html><h1>413 Request Entity Too Large</h1></html>');

          const { error } = await runCommand(['deploy']);

          expect(error?.message).to.contain(
            'The maximum source size is 128MB.',
          );
        });

        it('falls back to 256MB if the plans can not be loaded', async () => {
          api.get('/v1/me').query({ teamID: '' }).reply(403);
          stubSourceSize(256 * MB + 1);

          const { error } = await runCommand(['deploy']);

          expect(error?.message).to.contain(
            'The maximum source size is 256MB.',
          );
        });

        for (const [type, body] of [
          ['JSON', { message: 'unauthorized' }],
          ['text', 'unauthorized'],
        ] as const) {
          it(`still deploys if loading the plans gets a 401 with a ${type} body`, async () => {
            const { stub: exit } = stubProcessExit();
            api.get('/v1/me').query({ teamID: '' }).reply(401, body);
            mockUpload();
            mockRelease();

            const { stdout, error } = await runCommand(['deploy']);

            expect(exit.called).to.equal(false);
            expect(error).to.equal(undefined);
            expect(stdout).to.contain('Deployment finished successfully.');
          });
        }

        it('falls back to 256MB if the bundle plan has no limit', async () => {
          mockBundlePlan({ maxSourceSize: null });
          stubSourceSize(10 * MB);
          mockUpload();
          mockRelease();

          const { error } = await runCommand(['deploy']);

          expect(error).to.equal(undefined);
        });

        it('falls back to 256MB for a plan without a bundle plan', async () => {
          api
            .get('/v1/me')
            .query({ teamID: '' })
            .reply(200, { plans: { projectBundlePlans: {} } });
          stubSourceSize(256 * MB + 1);

          const { error } = await runCommand(['deploy']);

          expect(error?.message).to.contain(
            'The maximum source size is 256MB.',
          );
        });
      });
    });

    describe('platform version in liara.json', () => {
      for (const [platform, platformConfig, version] of [
        ['php', { version: '7.4' }, '7.4'],
        ['laravel', { phpVersion: '8.1' }, '8.1'],
        ['next', { nodeVersion: '20' }, '20'],
        ['next', { nodeVersion: 20 }, '20'],
        ['django', { pythonVersion: '3.6' }, '3.6'],
        ['go', { version: '1.20' }, '1.20'],
      ] as const) {
        it(`rejects ${platform} ${version}`, async () => {
          getConfigs.returns({
            path: 'test/fixtures/simple-gitignore',
            app,
            platform,
            port: 80,
            [platform]: platformConfig,
          });

          const { error } = await runCommand(['deploy', '--detach']);

          expect(error?.message).to.contain(
            `Version ${version} is no longer supported on the ${platform} platform.`,
          );
          expect(error?.message).to.contain('liara.json');
        });
      }

      it('sends a supported version', async () => {
        getConfigs.returns({
          path: 'test/fixtures/simple-gitignore',
          app,
          platform: 'php',
          php: { version: '8.4' },
        });
        mockUpload();
        api
          .post(
            `/v2/projects/${app}/releases`,
            (body) => body.platformConfig.version === '8.4',
          )
          .query({ teamID: '' })
          .reply(200, { releaseID: 'release-id' });

        const { stdout } = await runCommand(['deploy', '--detach']);

        expect(stdout).to.contain('Deployment created successfully.');
      });
    });
  });
});
