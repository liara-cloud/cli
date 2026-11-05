import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { expect } from 'chai';
import getPlatformVersion from '../../src/services/get-platform-version.ts';
import DeployException from '../../src/errors/deploy-exception.ts';
import { isDeprecatedVersion } from '../../src/utils/get-supported-versions.ts';

describe('getPlatformVersion', () => {
  const originalPath = process.env.PATH;
  let projectPath: string;

  beforeEach(() => {
    projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-version-'));
  });

  afterEach(() => {
    process.env.PATH = originalPath;
    fs.removeSync(projectPath);
  });

  // Makes a runtime report the given version, as if the developer installed it.
  const stubLocalRuntime = (command: string, output: string) => {
    const bin = path.join(projectPath, 'bin');
    fs.ensureDirSync(bin);
    fs.writeFileSync(path.join(bin, command), `#!/bin/sh\necho "${output}"\n`, {
      mode: 0o755,
    });
    process.env.PATH = `${bin}${path.delimiter}${originalPath}`;
  };

  const writeEngines = (node?: string) =>
    fs.writeJsonSync(path.join(projectPath, 'package.json'), {
      engines: node ? { node } : undefined,
    });

  const writeComposer = (composer: object) =>
    fs.writeJsonSync(path.join(projectPath, 'composer.json'), composer);

  describe('node', () => {
    for (const [range, version] of [
      ['24', '24'],
      ['22.x', '22'],
      ['22.1.0', '22'],
      // A supported app stays on the version the range starts from.
      ['>=22', '22'],
      ['^22 || ^24', '22'],
      ['<=24', '24'],
      // Otherwise it moves to the closest version the range allows.
      ['>=18', '22'],
      ['^20 || ^22', '22'],
      ['^20 || ^24', '24'],
    ]) {
      it(`uses ${version} for engines.node ${range}`, async () => {
        writeEngines(range);

        expect(await getPlatformVersion('node', projectPath)).to.equal(version);
      });
    }

    for (const range of ['18', '18.x', '^20.0.0', '<=20']) {
      it(`rejects engines.node ${range}`, async () => {
        writeEngines(range);

        const error = await getPlatformVersion('node', projectPath).catch(
          (error) => error,
        );

        expect(error).to.be.instanceOf(DeployException);
        expect(error.message).to.contain(`Version ${range} is no longer`);
        expect(error.message).to.contain('22, 24');
        expect(error.message).to.contain('engines.node');
      });
    }

    it('leaves a newer engines.node to the API', async () => {
      writeEngines('26');

      expect(await getPlatformVersion('node', projectPath)).to.equal(null);
    });

    for (const range of ['lts', '*']) {
      it(`leaves engines.node ${range} to the API`, async () => {
        writeEngines(range);

        expect(await getPlatformVersion('node', projectPath)).to.equal(null);
      });
    }

    it('does not send a deprecated local version', async () => {
      writeEngines();
      stubLocalRuntime('node', 'v18.20.0');

      expect(await getPlatformVersion('node', projectPath)).to.equal(null);
    });

    it('sends a supported local version', async () => {
      writeEngines();
      stubLocalRuntime('node', 'v24.1.0');

      expect(await getPlatformVersion('node', projectPath)).to.equal('24');
    });
  });

  for (const platform of ['php', 'laravel']) {
    describe(platform, () => {
      for (const [range, version] of [
        ['^8.1', '8.4'],
        ['^7.4|^8.0', '8.4'],
        ['>=7.4', '8.4'],
        ['8.2.5', '8.2'],
      ]) {
        it(`uses ${version} for require.php ${range}`, async () => {
          writeComposer({ require: { php: range } });

          expect(await getPlatformVersion(platform, projectPath)).to.equal(
            version,
          );
        });
      }

      it('prefers config.platform.php', async () => {
        writeComposer({
          config: { platform: { php: '8.3.1' } },
          require: { php: '^8.2' },
        });

        expect(await getPlatformVersion(platform, projectPath)).to.equal('8.3');
      });

      for (const range of ['^7.4', '8.1.*', '<8.2']) {
        it(`rejects require.php ${range}`, async () => {
          writeComposer({ require: { php: range } });

          const error = await getPlatformVersion(platform, projectPath).catch(
            (error) => error,
          );

          expect(error).to.be.instanceOf(DeployException);
          expect(error.message).to.contain('8.4, 8.3, 8.2');
          expect(error.message).to.contain('composer.json');
        });
      }

      it('does not send a deprecated local version', async () => {
        writeComposer({});
        stubLocalRuntime('php', 'PHP 7.4.33 (cli)');

        expect(await getPlatformVersion(platform, projectPath)).to.equal(null);
      });
    });
  }

  it('does not send a deprecated local python version', async () => {
    stubLocalRuntime('python', 'Python 3.6.9');

    expect(await getPlatformVersion('python', projectPath)).to.equal(null);
  });
});

describe('isDeprecatedVersion', () => {
  for (const [platform, version] of [
    ['node', 20],
    ['node', '18'],
    ['next', '20'],
    ['php', '8.1'],
    ['laravel', '7.4'],
    ['python', '3.6'],
    ['go', '1.20'],
  ] as const) {
    it(`treats ${platform} ${version} as deprecated`, () => {
      expect(isDeprecatedVersion(platform, version)).to.equal(true);
    });
  }

  for (const [platform, version] of [
    ['node', 22],
    ['node', '26'],
    ['next', '24'],
    ['php', '8.2'],
    ['python', '3.10'],
    ['go', '1.25'],
    ['node', 'latest'],
    ['docker', '1'],
  ] as const) {
    it(`does not treat ${platform} ${version} as deprecated`, () => {
      expect(isDeprecatedVersion(platform, version)).to.equal(false);
    });
  }
});
