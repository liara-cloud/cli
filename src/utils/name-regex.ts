export default function checkRegexPattern(str: string) {
  const regex = /^[a-z0-9][a-z0-9\\-]+[a-z0-9]$/;
  return regex.test(str);
}

export function checkVMNameRegexPattern(str: string) {
  const regex = /^[a-z][a-z0-9\-]+$/;
  return regex.test(str);
}
