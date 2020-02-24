import { execSync } from 'child_process'
import { DebugLogger } from './output';

export default function collectGitInfo(cwd: string, debug: DebugLogger) {
  const branch = retrieveConfig('git rev-parse --abbrev-ref HEAD', cwd, debug)
  const message = retrieveConfig('git log --format="%B" -n 1 HEAD', cwd, debug)
  const commit = retrieveConfig('git rev-parse HEAD', cwd, debug)
  const committedAt = retrieveConfig('git log --format="%ct" -n 1 HEAD', cwd, debug)
  const tags = retrieveConfig('git tag --points-at', cwd, debug)
  const remote = retrieveConfig('git ls-remote --get-url', cwd, debug)
  const author = {
    email: retrieveConfig('git log --format="%aE" -n 1 HEAD', cwd, debug),
    name: retrieveConfig('git log --format="%aN" -n 1 HEAD', cwd, debug),
  };

  return {
    branch,
    message,
    commit,
    committedAt,
    remote,
    author,
    tags: (tags && tags.split('\n')) || [],
  }
}

function retrieveConfig(command: string, cwd: string, debug: DebugLogger) {
  try {
    return execSync(command, { cwd, stdio : 'pipe' }).toString().trim()
  } catch (error) {
    debug(error.message)
    return null;
  }
}
