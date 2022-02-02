export default interface IHealthConfig {
  command?: string | string[],
  interval?: number,
  timeout?: number,
  retries?: number,
  startPeriod?: number,
}
