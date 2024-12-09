import inquirer from 'inquirer';
import { getDefaultPort } from './get-port.js';
import validatePort from './validate-port.js';

export async function promptPort(platform: string): Promise<number> {
  const { port } = (await inquirer.prompt({
    name: 'port',
    type: 'input',
    default: getDefaultPort(platform),
    message: 'Enter the port your app listens to:',
    validate: validatePort,
  })) as { port: number };

  return port;
}
