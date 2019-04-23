import fs from 'fs-extra'
import axios, {AxiosRequestConfig} from 'axios'
import Command, {flags} from '@oclif/command'

import './interceptors'
import {API_BASE_URL, GLOBAL_CONF_PATH} from './constants'

export interface IGlobalLiaraConfig {
  'api-token'?: string,
}

export default abstract class extends Command {
  static flags = {
    help: flags.help({char: 'h'}),
    dev: flags.boolean({description: 'run in dev mode', hidden: true}),
    debug: flags.boolean({char: 'd', description: 'show debug logs'}),
    'api-token': flags.string({description: 'your api token to use for authentication'}),
  }

  axiosConfig: AxiosRequestConfig = {
    ...axios.defaults,
    baseURL: API_BASE_URL,
  }

  readGlobalConfig(): IGlobalLiaraConfig {
    let content

    try {
      content = JSON.parse(fs.readFileSync(GLOBAL_CONF_PATH).toString('utf-8')) || {}
    } catch {
      content = {}
    }

    // For backward compatibility with < 1.0.0 versions
    if (content.api_token) {
      content['api-token'] = content.api_token
      delete content.api_token
    }

    return content
  }

  async catch(error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      this.error(`Could not connect to ${(error.config && error.config.baseURL) || 'https://api.liara.ir'}.
Please check your network connection.`)
    }

    if (error.oclif && error.oclif.exit === 0) return
    this.error(error.message)
  }
}
