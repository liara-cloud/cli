import chalk from 'chalk'

export type DebugLogger = (str: string) => void

export function createDebugLogger(debugEnabled = false): DebugLogger {
  return function (str: string) {
    if (debugEnabled) {
      // tslint:disable-next-line: no-console
      console.log(
        `${chalk.bold('[debug]')} ${chalk.gray(
          `[${new Date().toISOString()}]`
        )} ${str}`
      )
    }
  }
}
