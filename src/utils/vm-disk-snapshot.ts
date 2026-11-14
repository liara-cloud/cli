import { IVMDisk, IVMSnapshot } from '../types/vm.js';
import { formatBytes, formatDateTime } from './vm.js';

export const SNAPSHOT_OPERATIONS = {
  create: ['CREATE_VM_SNAPSHOT'],
  revert: ['REVERT_VM_SNAPSHOT'],
  delete: ['DELETE_VM_SNAPSHOT'],
};

export function describeDisk(disk: IVMDisk) {
  return `${disk.name} (${disk.size} GB)`;
}

export function describeSnapshot(snapshot: IVMSnapshot) {
  const current = snapshot.isCurrent ? ' [current]' : '';
  return `${snapshot.name}${current} (${formatBytes(snapshot.sizeB)}, ${formatDateTime(snapshot.createdAt)})`;
}
