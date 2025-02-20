import os from 'node:os';
import path from 'node:path';

export const DEV_MODE = process.argv.includes('--dev');

export const GLOBAL_CONF_PATH = path.join(os.homedir(), '.liara-auth.json');

export const GLOBAL_CONF_VERSION = '1';

export const REGIONS_API_URL: { [key: string]: string } = {
  iran: 'https://api.iran.liara.ir',
  germany: 'https://api.liara.ir',
};

export const IAAS_API_URL = 'https://iaas-api.liara.ir';

export const MAIL_SERVICE_URL = 'https://mail-service.iran.liara.ir';

export const MAIL_SERVICE_URL_DEV = 'http://localhost:6336';

export const OBJECT_STORAGE_API_URL = 'https://storage-service.iran.liara.ir';

export const OBJECT_STORAGE_API_URL_DEV = 'http://localhost:3001';

export const FALLBACK_REGION = 'iran';

export const MAX_SOURCE_SIZE = 256 * 1024 * 1024; // 256 MiB

export const AVAILABLE_PLATFORMS = [
  'node',
  'laravel',
  'php',
  'python',
  'django',
  'flask',
  'dotnet',
  'react',
  'angular',
  'vue',
  'static',
  'docker',
  'next',
  'go',
];

export const OBJ_PERMISSION = ['public', 'private'];
export const MAIL_SERVICE_PLANS = [
  'm1',
  'm2',
  'm3',
  'm4',
  'm5',
  'm6',
  'm7',
  'm8',
];

export const MAIL_SERVICE_MODES = ['DEV', 'LIVE'];
