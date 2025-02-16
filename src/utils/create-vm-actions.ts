import ora from 'ora';
import { Got } from 'got';

export async function createAction(
  vmId: string,
  action: 'start' | 'shutdown' | 'reboot' | 'stop',
  gotClient: Got,
) {
  const spinner = ora();
  spinner.start('Loading...');
  try {
    await gotClient.patch(`vm/power/${vmId}`, {
      json: {
        action,
      },
    });
    spinner.succeed('VM started successfully!');
  } catch (error) {
    spinner.stop();
    throw new Error('Action failed.');
  }
}
