export default class BuildFailed extends Error {

  constructor(message: string, public output: any) {
    super(message)
    this.output = output

    Error.captureStackTrace(this, this.constructor)
  }
}