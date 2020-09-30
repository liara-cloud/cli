import os from 'os'
import path from 'path'

export const DEV_MODE = process.argv.includes('--dev')

export const GLOBAL_CONF_PATH = path.join(os.homedir(), '.liara.json')

export const REGIONS_API_URL: {[key: string]: string} = {
  iran: "https://api.iran.liara.ir",
  germany: "https://api.liara.ir",
};

export const FALLBACK_REGION = 'germany'
