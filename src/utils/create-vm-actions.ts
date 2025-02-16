import ora from 'ora';
import { Got } from 'got';

export async function createAction(
  vmId: string,
  action: 'start' | 'shutdown' | 'reboot' | 'stop',
  gotClient: Got,
) {
  try {
    await gotClient.patch(`vm/power/${vmId}`, {
      json: {
        action,
      },
    });
  } catch (error) {
    throw new Error('Action failed.');
  }
}
