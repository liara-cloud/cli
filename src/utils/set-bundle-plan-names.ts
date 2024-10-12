const getBundlePlanName = (bundlePlan: string) => {
  switch (bundlePlan) {
    case 'free':
      return 'Free';
    case 'basic':
      return 'Bronze';
    case 'standard':
      return 'Silver';
    case 'pro':
      return 'Gold';
    default:
      return 'Bundle plan';
  }
};

export default getBundlePlanName;
