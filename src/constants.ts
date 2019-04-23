import os from 'os'
import path from 'path'

export const DEV_MODE = process.argv.includes('--dev')

// tslint:disable-next-line:no-http-string
export const API_BASE_URL = DEV_MODE ? 'http://localhost:3000' : 'https://api.liara.ir'

export const GLOBAL_CONF_PATH = path.join(os.homedir(), '.liara.json')
