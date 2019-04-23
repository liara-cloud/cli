import axios from 'axios'
import {CLIError} from '@oclif/errors'

axios.interceptors.response.use(response => response, error => {
  if (error.response && error.response.status === 401) {
    // tslint:disable-next-line: no-console
    console.error(new CLIError(`Authentication failed.
Please login via 'liara login' command.`).render())
    process.exit(2)
  }

  return Promise.reject(error)
})
