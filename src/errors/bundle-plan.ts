export const BundlePlanError = {
  max_deploy_per_day(bundlePlan: string) {
    switch (bundlePlan) {
      case 'free':
        return `You've reached the maximum of 10 deployments for today on the Free plan. Please try again tomorrow or consider upgrading your plan for more deployments.`;
      case 'standard':
        return `You've reached the maximum of 50 deployments for today on the Standard plan. Please try again tomorrow or consider upgrading your plan for more deployments.`;
      default:
        return `Maximum deployment limit reached for today. Please try again tomorrow or consider upgrading your plan.`;
    }
  },

  max_source_size(bundlePlan: string) {
    switch (bundlePlan) {
      case 'free':
        return `The maximum source size is 128MB on the Free plan. Please reduce your source code size or consider upgrading your plan.`;
      case 'standard':
        return `The maximum source size is 256MB on the Standard plan. Please reduce your source code size or consider upgrading your plan.`;
      default:
        return `Maximum source size limit reached. Please reduce your source code size.`;
    }
  },

  max_build_time(bundlePlan: string) {
    switch (bundlePlan) {
      case 'free':
        return `The build timed out after 5 minutes on the Free plan. 
                Solutions:
                1. Try again.
                2. Upgrade your plan for more build time.`;
      case 'standard':
        return `The build timed out after 10 minutes on the Standard plan.
                Solutions:
                1. Try again.
                2. Upgrade your plan for more build time.`;
      case 'enterprise':
        return `The build timed out after 20 minutes. Please Try again later.`;
      default:
        return `Build timed out. Please try again or consider upgrading your plan for more build time.`;
    }
  },

  germany_builder_not_allowed(bundlePlan: string) {
    if (bundlePlan === 'free') {
      return `Deployments to the Germany builder are not allowed on the Free plan. Please upgrade your plan for access.`;
    }
    return `Deployments to the Germany builder are restricted. Please upgrade your plan for access.`;
  },

  max_logs_period(bundlePlan: string) {
    switch (bundlePlan) {
      case 'free':
        return `On the Free plan, you can only view logs from the past 1 hour. Please upgrade your plan to access older logs.`;
      case 'standard':
        return `On the Standard plan, you can only view logs from the past 30 days. Please upgrade your plan to access older logs.`;
      default:
        return `Log retention limit reached. Please upgrade your plan to access more logs.`;
    }
  },

  max_disks_limit(bundlePlan: string) {
    switch (bundlePlan) {
      case 'free':
        return `You can create only 1 disk on the Free plan. Please upgrade your plan to create more disks.`;
      case 'standard':
        return `You've reached the limit of 5 disks on the Standard plan. Please upgrade your plan to create more disks.`;
      default:
        return `Disk creation failed. Please try again.
            If you still have problems, please contact support by submitting a ticket at https://console.liara.ir/tickets.`;
    }
  },
};
