import { Got } from 'got';
import { VMActions } from '../types/vm.js';

export async function createAction(
  vmId: string,
  action: VMActions,
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
