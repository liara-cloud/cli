import bytes from 'bytes';
import moment from 'moment';
import * as shamsi from 'shamsi-date-converter';

import {
  IVMDailyTraffic,
  IVMMetricPoint,
  IVMMetricsSummaryResponse,
  IVMTrafficRow,
  VMInitScriptType,
} from '../types/vm.js';

export const APPS_WITHOUT_SSH_PORT = ['bigbluebutton'];

export const INIT_SCRIPT_TYPES: VMInitScriptType[] = ['shell', 'powershell'];

export const INIT_SCRIPT_EXTENSIONS: { [type in VMInitScriptType]: string } = {
  shell: 'sh',
  powershell: 'ps1',
};

export const VM_METRICS = ['cpu', 'memory', 'disk', 'diskIO'] as const;
export type VMMetric = (typeof VM_METRICS)[number];

interface IRange {
  amount: number;
  unit: 'hours' | 'days' | 'weeks';
  // Seconds added to the start of the range (the console does this to keep
  // the 24h traffic query inside the retention window).
  bufferSeconds?: number;
}

export const METRIC_RANGES: { [range: string]: IRange } = {
  '1h': { amount: 1, unit: 'hours' },
  '3h': { amount: 3, unit: 'hours' },
  '24h': { amount: 24, unit: 'hours' },
  '48h': { amount: 48, unit: 'hours' },
  '1w': { amount: 1, unit: 'weeks' },
  '1m': { amount: 30, unit: 'days' },
};

export const TRAFFIC_RANGES: { [range: string]: IRange } = {
  '1h': { amount: 1, unit: 'hours' },
  '3h': { amount: 3, unit: 'hours' },
  '24h': { amount: 24, unit: 'hours', bufferSeconds: 60 },
};

export const MAX_DAILY_TRAFFIC_DAYS = 30;

export function isWindowsOS(os: string) {
  return os.includes('windows');
}

// The vm OS looks like "ubuntu-22.04" or "gitlabce-16" for one-click apps.
export function getOSName(os: string) {
  return os.split('-')[0];
}

export function getRootUsername(os: string) {
  return isWindowsOS(os) ? 'Administrator' : 'root';
}

const BASE_PLAN = 'standard-base-g2';
const PLUS_PLAN = 'standard-plus-g2';
const PRO_PLAN = 'pro-g2';

// Plans the console does not let you pick for an OS or a one-click app.
export function getDisabledPlans(os: string): string[] {
  const name = getOSName(os);

  if (isWindowsOS(os)) {
    return [BASE_PLAN];
  }

  if (
    ['gitlabce', 'appwrite', 'supabase', 'jitsi', 'bigbluebutton'].includes(
      name,
    )
  ) {
    return [BASE_PLAN, PLUS_PLAN];
  }

  if (name.includes('sentry')) {
    return [BASE_PLAN, PLUS_PLAN, PRO_PLAN];
  }

  return [];
}

export function validateVMName(name: string): string | null {
  if (name.length < 3) {
    return 'The vm name must be at least 3 characters long.';
  }

  if (name.length > 20) {
    return 'The vm name must be at most 20 characters long.';
  }

  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name)) {
    return 'Invalid vm name. Use only lowercase letters, numbers, or hyphens; it must not start or end with a hyphen.';
  }

  return null;
}

export function validateSSHKey(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed) {
    return 'The SSH key cannot be empty.';
  }

  // The trailing comment may contain anything, the key type and body must not.
  const withoutComment = trimmed.split(' ').slice(0, 2).join(' ');
  if (/[^\x20-\x7E]/.test(withoutComment)) {
    return 'The SSH key is not valid. Please enter a valid key.';
  }

  return null;
}

export function validateSSHPort(port: number | string): string | null {
  const value = Number(port);

  if (value === 25) {
    return 'Port 25 cannot be used as the SSH port.';
  }

  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    return 'The SSH port must be a number between 1 and 65535.';
  }

  return null;
}

export function getScriptTypeByFileName(
  fileName: string,
): VMInitScriptType | undefined {
  const extension = fileName.split('.').pop()?.toLowerCase();

  return INIT_SCRIPT_TYPES.find(
    (type) => INIT_SCRIPT_EXTENSIONS[type] === extension,
  );
}

export function getInitScriptTypeForOS(os: string): VMInitScriptType {
  return isWindowsOS(os) ? 'powershell' : 'shell';
}

export function formatBytes(value: number | string | undefined | null) {
  return bytes.format(Number(value) || 0, {
    decimalPlaces: 1,
    unitSeparator: ' ',
  });
}

// Jalali date like the other commands show, followed by the time.
export function formatDateTime(date: string | number | Date) {
  const value = moment(date);
  if (!value.isValid()) {
    return String(date ?? '-');
  }

  const [year, month, day] = shamsi.gregorianToJalali(value.toDate());
  const pad = (part: number) => String(part).padStart(2, '0');

  return `${year}-${pad(month)}-${pad(day)} ${value.format('HH:mm:ss')}`;
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

// The first unix second the history of a vm can contain: the start of the
// range, but never before the vm was created.
export function calculateSince(
  range: string,
  vmCreatedAt?: string,
  now = moment(),
): number {
  const option = METRIC_RANGES[range] || METRIC_RANGES['1h'];
  const rangeStart = now.clone().subtract(option.amount, option.unit).unix();
  const createdAt = vmCreatedAt ? new Date(vmCreatedAt).getTime() : Number.NaN;

  if (!Number.isFinite(createdAt)) {
    return rangeStart;
  }

  return Math.max(rangeStart, Math.floor(createdAt / 1000) + 1);
}

export function getTrafficSince(range: string, now = moment()): number {
  const option = TRAFFIC_RANGES[range] || TRAFFIC_RANGES['1h'];

  return (
    now.clone().subtract(option.amount, option.unit).unix() +
    (option.bufferSeconds || 0)
  );
}

// Timestamps arrive in seconds or in milliseconds.
export function normalizeTimestamp(value: unknown): number | null {
  const timestamp = Number(value);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  return timestamp >= 1_000_000_000_000 ? timestamp / 1000 : timestamp;
}

export interface IScalarPoint {
  time: number;
  value: number | null;
}

export function normalizeScalarPoints(
  points: IVMMetricPoint[],
): IScalarPoint[] {
  const byTime = new Map<number, number | null>();

  for (const point of Array.isArray(points) ? points : []) {
    const time = normalizeTimestamp(point?.timestamp);
    if (time === null) continue;

    byTime.set(time, toNullableNumber(point?.value));
  }

  return [...byTime.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, value]) => ({ time, value }));
}

export interface IDiskIOPoint {
  time: number;
  read: number | null;
  write: number | null;
}

export function normalizeDiskIOPoints(
  points: IVMMetricPoint[],
): IDiskIOPoint[] {
  const byTime = new Map<
    number,
    { read: number | null; write: number | null }
  >();

  for (const point of Array.isArray(points) ? points : []) {
    const time = normalizeTimestamp(point?.timestamp);
    if (time === null) continue;

    const values =
      point.value && typeof point.value === 'object' ? point.value : point;

    byTime.set(time, {
      read: toNullableNumber(values.read),
      write: toNullableNumber(values.write),
    });
  }

  return [...byTime.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, values]) => ({ time, ...values }));
}

export function normalizeSummary(data: IVMMetricsSummaryResponse) {
  const result = data?.result;

  if (!result || typeof result !== 'object') {
    return null;
  }

  return {
    cpu: toNullableNumber(result.cpu),
    memory: toNullableNumber(result.memory),
    disk: toNullableNumber(result.disk),
    diskIO: {
      read: toNullableNumber(result.diskIO?.read),
      write: toNullableNumber(result.diskIO?.write),
    },
  };
}

export function formatPercent(value: number | null) {
  return value === null ? '-' : `${Math.round(value * 10) / 10}%`;
}

export function formatDiskIO(value: number | null) {
  return value === null ? '-' : `${Math.round(value * 100) / 100} MB/s`;
}

// Sums the bytes sent to every destination ip, biggest first.
export function aggregateTraffic(rows: IVMTrafficRow[]) {
  const byIp = new Map<string, number>();

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row?.dstip) continue;

    byIp.set(
      row.dstip,
      (byIp.get(row.dstip) || 0) + (Number(row.sumbytes) || 0),
    );
  }

  return [...byIp.entries()]
    .map(([ip, total]) => ({ ip, bytes: total }))
    .sort((a, b) => b.bytes - a.bytes);
}

export function getDailyTrafficStart(
  days: number,
  vmCreatedAt?: string,
  now = moment(),
) {
  const rangeStart = now
    .clone()
    .subtract(days - 1, 'days')
    .startOf('day');
  const createdAt = moment(vmCreatedAt);

  return vmCreatedAt && createdAt.isValid() && createdAt.isAfter(rangeStart)
    ? createdAt.clone().add(1, 'second')
    : rangeStart;
}

const DAY_FORMAT = 'YYYY-MM-DD';

// Every day of the range gets a row, days without a report are zero.
export function normalizeDailyTraffic(
  daily: IVMDailyTraffic[],
  rangeStart: moment.Moment,
  rangeEnd = moment(),
) {
  const firstDay = rangeStart.clone().startOf('day');
  const lastDay = rangeEnd.clone().startOf('day');
  const byDay = new Map<string, { bytes: number; price: number }>();

  for (const item of Array.isArray(daily) ? daily : []) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(item?.day ?? ''));
    if (!match) continue;

    const day = moment([
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    ]);
    if (!day.isValid() || day.isBefore(firstDay) || day.isAfter(lastDay)) {
      continue;
    }

    const key = day.format(DAY_FORMAT);
    const current = byDay.get(key) || { bytes: 0, price: 0 };
    byDay.set(key, {
      bytes: current.bytes + (Number(item.bytes) || 0),
      price: current.price + (Number(item.price) || 0),
    });
  }

  const rows: { day: string; bytes: number; price: number }[] = [];
  for (
    const day = firstDay.clone();
    day.isSameOrBefore(lastDay, 'day');
    day.add(1, 'day')
  ) {
    const key = day.format(DAY_FORMAT);
    rows.push({ day: key, ...(byDay.get(key) || { bytes: 0, price: 0 }) });
  }

  return rows;
}

export const FROZEN_VM_MESSAGE =
  'The vm is frozen. Use "liara vm unfreeze" to activate it first.';

export interface IPlanLike {
  RAM: { amount: number };
  CPU: { amount: number };
  volume: number;
  monthlyPrice: number;
}

// Free plans are never offered. Plans that the console disables for an OS or
// a one-click app are skipped when the OS is known.
export function getSelectablePlans(
  plans: { [key: string]: unknown },
  os?: string,
): string[] {
  const disabled = os ? getDisabledPlans(os) : [];

  return Object.keys(plans).filter(
    (key) => !key.startsWith('free') && !disabled.includes(key),
  );
}

export function formatPlanChoice(plan: IPlanLike) {
  const { RAM, CPU, volume, monthlyPrice } = plan;
  const ram = `RAM: ${String(RAM.amount).padEnd(4)} GB`;
  const cpu = `CPU: ${String(CPU.amount).padEnd(4)} Core${CPU.amount > 1 ? 's' : ' '}`;
  const disk = `Disk: ${String(volume).padEnd(4)} GB`;
  const price = `Price: ${monthlyPrice.toLocaleString().padEnd(10)} Tomans/Month`;

  return `${ram.padEnd(8)} | ${cpu.padEnd(10)} | ${disk.padEnd(8)} | ${price}`;
}

// Finds items by their id or name; a name can match more than one item.
export function findByIdOrName<T extends { _id: string; name?: string }>(
  items: T[],
  value: string,
): T[] {
  const byId = items.filter((item) => item._id === value);
  return byId.length > 0 ? byId : items.filter((item) => item.name === value);
}
