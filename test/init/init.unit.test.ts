import sinon from 'sinon';
import inquirer from 'inquirer';
import { expect } from 'chai';
import Init from '../../src/commands/init.ts';

describe('init', function () {
  const promptPlatformVersion = (platform: string, version?: string) =>
    Init.prototype.promptPlatformVersion.call(
      Object.create(Init.prototype),
      platform,
      version,
    );

  afterEach(() => {
    sinon.restore();
  });

  it('rejects a deprecated version from the flag', async () => {
    const error = await promptPlatformVersion('node', '18').catch(
      (error) => error,
    );

    expect(error.message).to.contain('Version 18 is no longer supported');
    expect(error.message).to.contain('--version');
  });

  it('accepts a supported version from the flag', async () => {
    expect(await promptPlatformVersion('node', '24')).to.equal('24');
  });

  for (const [platform, defaultVersion, versions] of [
    ['node', '24', ['22', '24']],
    ['next', '24', ['22', '24']],
    ['php', '8.4', ['8.4', '8.3', '8.2']],
    ['laravel', '8.4', ['8.4', '8.3', '8.2']],
  ] as const) {
    it(`only offers the supported ${platform} versions`, async () => {
      const prompt = sinon
        .stub(inquirer, 'prompt')
        .resolves({ version: defaultVersion });

      await promptPlatformVersion(platform);

      const question = prompt.firstCall.args[0] as any;
      expect(question.choices).to.deep.equal(versions);
      expect(question.default).to.equal(defaultVersion);
    });
  }
});
