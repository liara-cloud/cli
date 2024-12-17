export const getMailPlanName = (plan: string): string | undefined => {
  const planNames: Record<string, string> = {
    m1: 'Amber',
    m2: 'Opal',
    m3: 'Jadeite',
    m4: 'Marble',
    m5: 'Turquoise',
    m6: 'Emerald',
    m7: 'Ruby',
    m8: 'Diamond',
  };

  return planNames[plan];
};
