import { exec } from 'child_process'
import * as path from 'path'
import { Readable } from 'stream'

export default async function run(args: string[]) {
  args.unshift('node', path.resolve(path.join(__dirname, '..', '..', 'bin', 'run')))
  const result = await exec(args.join(' '));
  return {
    stderr: await concatStreamPromise(result.stderr),
    stdout: await concatStreamPromise(result.stdout),
  }
}

function concatStreamPromise(stream: Readable) {
  return new Promise(resolve => {
    let result = '';
    stream.on('data', data => result += data);
    stream.on('end', () => resolve(result));
  });
}
