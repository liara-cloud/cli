import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import moment from 'moment';
import { expect } from 'chai';

import {
  aggregateTraffic,
  calculateSince,
  findByIdOrName,
  formatBytes,
  formatDiskIO,
  formatPercent,
  formatPlanChoice,
  getDailyTrafficStart,
  getDisabledPlans,
  getInitScriptTypeForOS,
  getRootUsername,
  getScriptTypeByFileName,
  getSelectablePlans,
  getTrafficSince,
  normalizeDailyTraffic,
  normalizeDiskIOPoints,
  normalizeScalarPoints,
  normalizeSummary,
  normalizeTimestamp,
  validateSSHKey,
  validateSSHPort,
  validateVMName,
} from '../../src/utils/vm.ts';
import { resolveScriptInput } from '../../src/utils/vm-script.ts';
import { checkVMNameRegexPattern } from '../../src/utils/name-regex.ts';

describe('vm utils', () => {
  describe('validateVMName', () => {
    it('accepts valid names', () => {
      for (const name of ['abc', 'my-vm', '1vm', 'a'.repeat(20)]) {
        expect(validateVMName(name), name).to.equal(null);
      }
    });

    it('rejects names that are too short or too long', () => {
      expect(validateVMName('ab')).to.include('at least 3');
      expect(validateVMName('a'.repeat(21))).to.include('at most 20');
    });

    it('rejects invalid characters and edge hyphens', () => {
      for (const name of ['-abc', 'abc-', 'ABC', 'a_b_c', 'a b c']) {
        expect(validateVMName(name), name).to.include('Invalid vm name');
      }
    });

    it('matches the regex used by checkVMNameRegexPattern', () => {
      expect(checkVMNameRegexPattern('1vm')).to.equal(true);
      expect(checkVMNameRegexPattern('vm-')).to.equal(false);
    });
  });

  describe('validateSSHKey', () => {
    it('accepts a key with a comment that has any characters', () => {
      expect(validateSSHKey('ssh-ed25519 AAAAC3Nz user@host')).to.equal(null);
      expect(validateSSHKey('ssh-ed25519 AAAAC3Nz سلام')).to.equal(null);
    });

    it('rejects empty keys', () => {
      expect(validateSSHKey('   ')).to.include('cannot be empty');
    });

    it('rejects non printable characters in the key body', () => {
      expect(validateSSHKey('ssh-rsa AAAA\u200bBBB')).to.include('not valid');
    });
  });

  describe('validateSSHPort', () => {
    it('accepts ports between 1 and 65535', () => {
      expect(validateSSHPort(1)).to.equal(null);
      expect(validateSSHPort('2222')).to.equal(null);
      expect(validateSSHPort(65_535)).to.equal(null);
    });

    it('rejects port 25', () => {
      expect(validateSSHPort(25)).to.include('Port 25');
    });

    it('rejects out of range and non integer ports', () => {
      for (const port of [0, 65_536, -1, 22.5, 'abc']) {
        expect(validateSSHPort(port), String(port)).to.include('between');
      }
    });
  });

  describe('getDisabledPlans', () => {
    it('disables the base plan on windows', () => {
      expect(getDisabledPlans('windows-2022')).to.deep.equal([
        'standard-base-g2',
      ]);
    });

    it('disables small plans for heavy one-click apps', () => {
      for (const app of [
        'gitlabce',
        'appwrite',
        'supabase',
        'jitsi',
        'bigbluebutton',
      ]) {
        expect(getDisabledPlans(`${app}-1`), app).to.deep.equal([
          'standard-base-g2',
          'standard-plus-g2',
        ]);
      }
    });

    it('disables the three smallest plans for sentry', () => {
      expect(getDisabledPlans('sentry-24')).to.deep.equal([
        'standard-base-g2',
        'standard-plus-g2',
        'pro-g2',
      ]);
    });

    it('disables nothing for a regular os', () => {
      expect(getDisabledPlans('ubuntu-22.04')).to.deep.equal([]);
    });
  });

  describe('getSelectablePlans', () => {
    const plans = { free: {}, 'free-windows': {}, a: {}, b: {} };

    it('hides free plans', () => {
      expect(getSelectablePlans(plans)).to.deep.equal(['a', 'b']);
    });

    it('hides the plans disabled for the os', () => {
      const all = { 'standard-base-g2': {}, 'pro-g2': {}, free: {} };
      expect(getSelectablePlans(all, 'windows-2022')).to.deep.equal(['pro-g2']);
    });
  });

  describe('os helpers', () => {
    it('picks the username by os', () => {
      expect(getRootUsername('windows-2022')).to.equal('Administrator');
      expect(getRootUsername('ubuntu-22.04')).to.equal('root');
    });

    it('picks the init script type by os', () => {
      expect(getInitScriptTypeForOS('windows')).to.equal('powershell');
      expect(getInitScriptTypeForOS('ubuntu')).to.equal('shell');
    });

    it('detects the script type by file name', () => {
      expect(getScriptTypeByFileName('a.sh')).to.equal('shell');
      expect(getScriptTypeByFileName('dir/a.PS1')).to.equal('powershell');
      expect(getScriptTypeByFileName('a.txt')).to.equal(undefined);
    });
  });

  describe('formatters', () => {
    it('formats bytes', () => {
      expect(formatBytes(0)).to.equal('0 B');
      expect(formatBytes('1048576')).to.equal('1 MB');
      expect(formatBytes(undefined)).to.equal('0 B');
    });

    it('formats percents and disk io', () => {
      expect(formatPercent(12.345)).to.equal('12.3%');
      expect(formatPercent(null)).to.equal('-');
      expect(formatDiskIO(1.234)).to.equal('1.23 MB/s');
      expect(formatDiskIO(null)).to.equal('-');
    });

    it('formats a plan choice', () => {
      const choice = formatPlanChoice({
        RAM: { amount: 2 },
        CPU: { amount: 1 },
        volume: 50,
        monthlyPrice: 1000,
      });

      expect(choice).to.include('RAM: 2');
      expect(choice).to.include('CPU: 1');
      expect(choice).to.include('Core ');
      expect(choice).to.include('Disk: 50');
      expect(choice).to.include(`${(1000).toLocaleString()}`);
    });
  });

  describe('findByIdOrName', () => {
    const items = [
      { _id: '1', name: 'a' },
      { _id: '2', name: 'a' },
      { _id: 'a', name: 'c' },
    ];

    it('prefers an id match', () => {
      expect(findByIdOrName(items, 'a')).to.deep.equal([items[2]]);
    });

    it('returns every name match', () => {
      expect(findByIdOrName(items, 'c')).to.have.length(1);
      expect(findByIdOrName([items[0], items[1]], 'a')).to.have.length(2);
      expect(findByIdOrName(items, 'zzz')).to.deep.equal([]);
    });
  });

  describe('time ranges', () => {
    const now = moment.unix(1_700_000_000);

    it('calculates the start of a metric range', () => {
      expect(calculateSince('1h', undefined, now)).to.equal(
        1_700_000_000 - 3600,
      );
      expect(calculateSince('1m', undefined, now)).to.equal(
        1_700_000_000 - 30 * 86_400,
      );
      expect(calculateSince('unknown', undefined, now)).to.equal(
        1_700_000_000 - 3600,
      );
    });

    it('never starts before the vm was created', () => {
      const createdAt = new Date((1_700_000_000 - 600) * 1000).toISOString();

      expect(calculateSince('1h', createdAt, now)).to.equal(
        1_700_000_000 - 599,
      );
      expect(calculateSince('1h', 'not a date', now)).to.equal(
        1_700_000_000 - 3600,
      );
    });

    it('calculates the start of a traffic range', () => {
      expect(getTrafficSince('3h', now)).to.equal(1_700_000_000 - 3 * 3600);
      expect(getTrafficSince('24h', now)).to.equal(1_700_000_000 - 86_400 + 60);
      expect(getTrafficSince('bad', now)).to.equal(1_700_000_000 - 3600);
    });
  });

  describe('metric normalization', () => {
    it('normalizes timestamps in seconds and milliseconds', () => {
      expect(normalizeTimestamp(1_700_000_000)).to.equal(1_700_000_000);
      expect(normalizeTimestamp(1_700_000_000_000)).to.equal(1_700_000_000);
      expect(normalizeTimestamp(0)).to.equal(null);
      expect(normalizeTimestamp('x')).to.equal(null);
    });

    it('sorts and deduplicates scalar points', () => {
      const points = normalizeScalarPoints([
        { timestamp: 20, value: 2 },
        { timestamp: 10, value: '1' },
        { timestamp: 20, value: 5 },
        { timestamp: -1, value: 9 },
        { timestamp: 30, value: null as any },
      ]);

      expect(points).to.deep.equal([
        { time: 10, value: 1 },
        { time: 20, value: 5 },
        { time: 30, value: null },
      ]);
      expect(normalizeScalarPoints(undefined as any)).to.deep.equal([]);
    });

    it('reads disk io values from the value object or the point', () => {
      const points = normalizeDiskIOPoints([
        { timestamp: 2, value: { read: 1, write: 2 } },
        { timestamp: 1, read: 3, write: undefined },
      ]);

      expect(points).to.deep.equal([
        { time: 1, read: 3, write: null },
        { time: 2, read: 1, write: 2 },
      ]);
    });

    it('normalizes the summary', () => {
      expect(normalizeSummary({ result: null })).to.equal(null);
      expect(
        normalizeSummary({
          result: { cpu: 1, memory: '2', diskIO: { read: 3 } },
        }),
      ).to.deep.equal({
        cpu: 1,
        memory: 2,
        disk: null,
        diskIO: { read: 3, write: null },
      });
    });
  });

  describe('traffic', () => {
    it('sums the bytes of each destination, biggest first', () => {
      expect(
        aggregateTraffic([
          { dstip: '1.1.1.1', sumbytes: 10 },
          { dstip: '2.2.2.2', sumbytes: '100' },
          { dstip: '1.1.1.1', sumbytes: 5 },
          { dstip: '', sumbytes: 99 },
        ]),
      ).to.deep.equal([
        { ip: '2.2.2.2', bytes: 100 },
        { ip: '1.1.1.1', bytes: 15 },
      ]);
      expect(aggregateTraffic(undefined as any)).to.deep.equal([]);
    });

    it('starts the daily report after the vm creation', () => {
      const now = moment('2026-05-10T12:00:00');

      expect(
        getDailyTrafficStart(30, undefined, now).format('YYYY-MM-DD'),
      ).to.equal('2026-04-11');

      const created = getDailyTrafficStart(30, '2026-05-09T08:00:00', now);
      expect(created.format('YYYY-MM-DD HH:mm:ss')).to.equal(
        '2026-05-09 08:00:01',
      );
    });

    it('fills the days without a report', () => {
      const rows = normalizeDailyTraffic(
        [
          { day: '2026-05-08', bytes: 10, price: 1 },
          { day: '2026-05-08T10:00:00', bytes: '5', price: 2 },
          { day: '2026-05-10', bytes: 7, price: 0 },
          { day: '2026-05-01', bytes: 100, price: 100 },
          { day: 'garbage', bytes: 1 },
        ],
        moment('2026-05-08T00:00:00'),
        moment('2026-05-10T12:00:00'),
      );

      expect(rows).to.deep.equal([
        { day: '2026-05-08', bytes: 15, price: 3 },
        { day: '2026-05-09', bytes: 0, price: 0 },
        { day: '2026-05-10', bytes: 7, price: 0 },
      ]);
    });
  });

  describe('resolveScriptInput', () => {
    let dir: string;

    beforeEach(async () => {
      dir = await fs.mkdtemp(path.join(os.tmpdir(), 'liara-vm-script-'));
    });

    afterEach(async () => {
      await fs.remove(dir);
    });

    it('reads a script file and infers the type', async () => {
      const file = path.join(dir, 'init.ps1');
      await fs.writeFile(file, 'Write-Host hi');

      expect(await resolveScriptInput({ file })).to.deep.equal({
        content: 'Write-Host hi',
        type: 'powershell',
      });
    });

    it('lets --type win over the extension', async () => {
      const file = path.join(dir, 'init.sh');
      await fs.writeFile(file, 'echo hi');

      const result = await resolveScriptInput({ file, type: 'powershell' });
      expect(result.type).to.equal('powershell');
    });

    it('returns inline content as is', async () => {
      expect(
        await resolveScriptInput({ content: 'echo hi', type: 'shell' }),
      ).to.deep.equal({ content: 'echo hi', type: 'shell' });
    });

    it('returns nothing when no script is given', async () => {
      expect(await resolveScriptInput({})).to.deep.equal({
        content: undefined,
        type: undefined,
      });
    });

    it('rejects --file together with --content', async () => {
      let message = '';
      try {
        await resolveScriptInput({ file: 'a.sh', content: 'x' });
      } catch (error) {
        message = error.message;
      }
      expect(message).to.include('either --file or --content');
    });

    it('rejects unknown extensions, missing files and empty scripts', async () => {
      const failures: string[] = [];
      for (const input of [
        { file: path.join(dir, 'a.txt') },
        { file: path.join(dir, 'missing.sh') },
        { content: '  ' },
        { content: 'x', type: 'bash' },
      ]) {
        try {
          await resolveScriptInput(input);
        } catch (error) {
          failures.push(error.message);
        }
      }

      expect(failures[0]).to.include('.sh or .ps1');
      expect(failures[1]).to.include('does not exist');
      expect(failures[2]).to.include('cannot be empty');
      expect(failures[3]).to.include('must be one of');
    });
  });
});
