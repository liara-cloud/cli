import os from 'os';
import path from 'path';

export const DEV_MODE = process.argv.includes('--dev');

export const GLOBAL_CONF_PATH = path.join(os.homedir(), '.liara-auth.json');
export const PREVIOUS_GLOBAL_CONF_PATH = path.join(os.homedir(), '.liara.json');
export const GLOBAL_CONF_VERSION = '1';

export const REGIONS_API_URL: { [key: string]: string } = {
  iran: 'https://api.iran.liara.ir',
  germany: 'https://api.liara.ir',
};

export const BASE_REGION = 'iran'

export const FALLBACK_REGION = 'germany';

export const MAX_SOURCE_SIZE = 256 * 1024 * 1024; // 256 MiB

export const AVAILABLE_PLATFORMS = [
  'node',
  'laravel',
  'php',
  'django',
  'flask',
  'netcore',
  'react',
  'angular',
  'vue',
  'static',
  'docker',
];

export const FREE_PLAN_PLATFORMS = ['static', 'react', 'vue', 'angular'];
