import EventEmitter from 'events'

export default class Poller extends EventEmitter {
  timeout: number

  /**
   * @param timeout how long should we wait after the poll started?
   */
  constructor(timeout = 1000) {
    super()
    this.timeout = timeout
  }

  poll() {
    setTimeout(() => this.emit('poll'), this.timeout)
  }

  onPoll(cb: () => void) {
    this.on('poll', cb)
  }
}
