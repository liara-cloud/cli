import { MAX_SOURCE_SIZE } from '../constants.js';

export const BundlePlanError = {
  max_deploy_per_day(bundlePlan: string) {
    switch (bundlePlan) {
      case 'free':
        return `You've reached the maximum of 10 deployments for today on the Free plan. Please try again tomorrow or consider upgrading your feature bundle plan for more deployments.`;
      case 'standard':
        return `You've reached the maximum of 50 deployments for today on the Standard plan. Please try again tomorrow or consider upgrading your feature bundle plan for more deployments.`;
      default:
        return `Maximum deployment limit reached for today. Please try again tomorrow or consider upgrading your feature bundle plan.`;
    }
  },

  max_source_size(maxSourceSize?: number) {
    if (!maxSourceSize) {
      return `Maximum source size limit reached. Please reduce your source code size.`;
    }

    const upgrade =
      maxSourceSize * 1024 * 1024 < MAX_SOURCE_SIZE
        ? ' or consider upgrading your feature bundle plan'
        : '';

    return `The maximum source size is ${maxSourceSize}MB. Please reduce your source code size${upgrade}.`;
  },

  germany_builder_not_allowed(bundlePlan: string) {
    if (bundlePlan === 'free') {
      return `Deployments to the Germany builder are not allowed on the Free plan. Please upgrade your feature bundle plan for access.`;
    }
    return `Deployments to the Germany builder are restricted. Please upgrade your feature bundle plan for access.`;
  },

  max_logs_period(bundlePlan: string) {
    switch (bundlePlan) {
      case 'free':
        return `On the Free plan, you can only view logs from the past 1 hour. Please upgrade your feature bundle plan to access older logs.`;
      case 'standard':
        return `On the Standard plan, you can only view logs from the past 30 days. Please upgrade your feature bundle plan to access older logs.`;
      default:
        return `Log retention limit reached. Please upgrade your feature bundle plan to access more logs.`;
    }
  },

  max_disks_limit(bundlePlan: string) {
    switch (bundlePlan) {
      case 'free':
        return `You can create only 1 disk on the Free plan. Please upgrade your feature bundle plan to create more disks.`;
      case 'standard':
        return `You've reached the limit of 5 disks on the Standard plan. Please upgrade your feature bundle plan to create more disks.`;
      default:
        return `Disk creation failed. Please try again.
            If you still have problems, please contact support by submitting a ticket at https://console.liara.ir/tickets`;
    }
  },

  legacy_max_logs_period() {
    return 'You are currently on the old infrastructure, you can only view logs from the past 7 days.';
  },
};
