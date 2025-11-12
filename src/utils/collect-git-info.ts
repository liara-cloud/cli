import { exec } from 'node:child_process';
import { DebugLogger } from './output.js';

export default async function collectGitInfo(cwd: string, debug: DebugLogger) {
  const branch = await retrieveConfig(
    'git rev-parse --abbrev-ref HEAD',
    cwd,
    debug,
  );
  const message = await retrieveConfig(
    'git log --format="%B" -n 1 HEAD',
    cwd,
    debug,
  );
  const commit = await retrieveConfig('git rev-parse HEAD', cwd, debug);
  const committedAt = await retrieveConfig(
    'git log --format="%ct" -n 1 HEAD',
    cwd,
    debug,
  );
  const tags = await retrieveConfig('git tag --points-at', cwd, debug);
  const remote = await retrieveConfig('git ls-remote --get-url', cwd, debug);
  const author = {
    email: await retrieveConfig('git log --format="%aE" -n 1 HEAD', cwd, debug),
    name: await retrieveConfig('git log --format="%aN" -n 1 HEAD', cwd, debug),
  };

  return {
    branch,
    message,
    commit,
    committedAt,
    remote,
    author,
    tags: (tags && tags.split('\n')) || [],
  };
}

function retrieveConfig(
  command: string,
  cwd: string,
  debug: DebugLogger,
): Promise<string | null> {
  return new Promise((resolve) => {
    exec(command, { cwd, windowsHide: true }, (err, stdout) => {
      if (err) {
        debug(err.message);
        return resolve(null);
      }

      return resolve(stdout.toString().trim());
    });
  });
}
