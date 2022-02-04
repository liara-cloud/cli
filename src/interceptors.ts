import axios from 'axios'
import { RequestError, Hooks } from 'got'
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

const hooks: Hooks = {
  beforeError:[
    error => {
      const {response} = error;
      if (response && response.statusCode === 401) {
        console.error(new CLIError(`Authentication failed.
Please login via 'liara login' command.`).render())
        process.exit(2)
      }
      return error
    }
  ]
}

export default hooks