import { createInterface } from 'readline';

export default function onInterupt(listener: () => any): () => any {
  if (process.platform === 'win32') {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on('SIGINT', listener);

    return () => rl.removeListener('SIGINT', listener);
  }

  process.on('SIGINT', listener);

  return () => process.removeListener('SIGINT', listener);
}
