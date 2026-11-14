import { Flags, ux } from '@oclif/core';

import VmCommand from '../../vm-command.js';
import {
  IVMMetricsHistoryResponse,
  IVMMetricsSummaryResponse,
} from '../../types/vm.js';
import { createDebugLogger } from '../../utils/output.js';
import {
  METRIC_RANGES,
  VM_METRICS,
  calculateSince,
  formatDateTime,
  formatDiskIO,
  formatPercent,
  normalizeDiskIOPoints,
  normalizeScalarPoints,
  normalizeSummary,
} from '../../utils/vm.js';

export default class VmMetrics extends VmCommand {
  static description =
    'show the resource usage (cpu, memory, disk and disk io) of a vm';

  static flags = {
    ...VmCommand.flags,
    ...ux.table.flags(),
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
    metric: Flags.string({
      char: 'm',
      description: 'show the history of one metric instead of the summary',
      options: [...VM_METRICS],
    }),
    range: Flags.string({
      char: 'r',
      description: 'time range of the history',
      options: Object.keys(METRIC_RANGES),
      default: '1h',
    }),
  };

  static aliases = ['vm:usage'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmMetrics);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      const vm = await this.selectVm(flags.vm, {
        notFound: 'vm does not exist.',
        filter: (vm) => vm.state !== 'DELETING',
      });

      if (!flags.metric) {
        const summary = normalizeSummary(
          await this.got(
            `vm/${vm._id}/metrics/summary`,
          ).json<IVMMetricsSummaryResponse>(),
        );

        if (!summary) {
          this.log(`There are no metrics for vm "${vm.name}" yet.`);
          return;
        }

        ux.table(
          [
            {
              CPU: formatPercent(summary.cpu),
              Memory: formatPercent(summary.memory),
              Disk: formatPercent(summary.disk),
              'Disk Read': formatDiskIO(summary.diskIO.read),
              'Disk Write': formatDiskIO(summary.diskIO.write),
            },
          ],
          {
            CPU: {},
            Memory: {},
            Disk: {},
            'Disk Read': {},
            'Disk Write': {},
          },
          flags,
        );
        return;
      }

      const since = calculateSince(flags.range, vm.createdAt);
      const { result } = await this.got(
        `vm/${vm._id}/metrics/${flags.metric}`,
        {
          searchParams: { since },
        },
      ).json<IVMMetricsHistoryResponse>();

      if (!Array.isArray(result) || result.length === 0) {
        this.log(`There is no ${flags.metric} data in this time range.`);
        return;
      }

      if (flags.metric === 'diskIO') {
        ux.table(
          normalizeDiskIOPoints(result).map((point) => ({
            Time: formatDateTime(point.time * 1000),
            Read: formatDiskIO(point.read),
            Write: formatDiskIO(point.write),
          })),
          { Time: {}, Read: {}, Write: {} },
          flags,
        );
        return;
      }

      ux.table(
        normalizeScalarPoints(result).map((point) => ({
          Time: formatDateTime(point.time * 1000),
          Usage: formatPercent(point.value),
        })),
        { Time: {}, Usage: {} },
        flags,
      );
    } catch (error) {
      this.fail(error, debug, {
        400: 'Invalid vm ID.',
        404: 'Could not find the vm.',
      });
    }
  }
}
