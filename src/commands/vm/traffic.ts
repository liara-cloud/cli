import { Flags, ux } from '@oclif/core';

import VmCommand from '../../vm-command.js';
import { IVMDailyTrafficResponse, IVMTrafficResponse } from '../../types/vm.js';
import { createDebugLogger } from '../../utils/output.js';
import {
  MAX_DAILY_TRAFFIC_DAYS,
  TRAFFIC_RANGES,
  aggregateTraffic,
  formatBytes,
  getDailyTrafficStart,
  getTrafficSince,
  normalizeDailyTraffic,
} from '../../utils/vm.js';

export default class VmTraffic extends VmCommand {
  static description = 'show the outgoing traffic of a vm';

  static flags = {
    ...VmCommand.flags,
    ...ux.table.flags(),
    vm: Flags.string({
      char: 'v',
      description: 'vm name',
    }),
    range: Flags.string({
      char: 'r',
      description: 'time range of the traffic by destination',
      options: Object.keys(TRAFFIC_RANGES),
      default: '1h',
    }),
    daily: Flags.boolean({
      description: 'show the traffic and its cost for each of the last 30 days',
    }),
  };

  static aliases = ['vm:bandwidth'];

  public async run(): Promise<void> {
    const { flags } = await this.parse(VmTraffic);
    const debug = createDebugLogger(flags.debug);

    await this.prepare(flags);

    try {
      const vm = await this.selectVm(flags.vm, {
        notFound: 'vm does not exist.',
        filter: (vm) => vm.state !== 'DELETING',
      });

      if (flags.daily) {
        const start = getDailyTrafficStart(
          MAX_DAILY_TRAFFIC_DAYS,
          vm.createdAt,
        );
        const { result } = await this.got(`vm/traffic-daily/${vm._id}`, {
          searchParams: { startTimeUnix: start.unix() },
        }).json<IVMDailyTrafficResponse>();

        ux.table(
          normalizeDailyTraffic(result?.daily || [], start).map((day) => ({
            Day: day.day,
            Traffic: formatBytes(day.bytes),
            'Cost (Tomans)': Math.trunc(day.price).toLocaleString(),
          })),
          { Day: {}, Traffic: {}, 'Cost (Tomans)': {} },
          flags,
        );
        return;
      }

      const since = getTrafficSince(flags.range);
      const { result } = await this.got(`vm/traffic-volume/${vm._id}`, {
        searchParams: { startTimeUnix: since },
      }).json<IVMTrafficResponse>();

      const destinations = aggregateTraffic(result);

      if (destinations.length === 0) {
        this.log('There is no traffic in this time range.');
        return;
      }

      ux.table(
        destinations.map((destination) => ({
          Destination: destination.ip,
          Traffic: formatBytes(destination.bytes),
        })),
        { Destination: {}, Traffic: {} },
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
