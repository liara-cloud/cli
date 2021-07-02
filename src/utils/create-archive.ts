import tar from 'tar'
import fs from 'fs-extra'
import {DebugLogger} from './output'
import ignore, {Ignore} from 'ignore'
import {relative, join, dirname} from 'path'

const defaultIgnores: string[] = [
  '.git',
  '.idea',
  '.vscode',
  '.next',
  '.gitignore',
  '.liaraignore',
  '.dockerignore',
  '*.*~',
  'liara.json',
  'node_modules',
  'bower_components',
]

const pythonPlatformsIgnores: string[] = [
  'venv',
  '/venv',
  '.venv',
  '.env',
  'ENV',
  '.python-version',
  '.cache',
  '__pycache__',
  'lib',
  'lib64',
  '*.py[cod]',
  '*$py.class',
  'pip-log.txt',
  'pip-delete-this-directory.txt',
  'celerybeat-schedule',
]

const platformIgnores: { [platform: string]: string[] } = {
  django: [
    ...pythonPlatformsIgnores,
    '*.log',
    'local_settings.py',
    'staticfiles',
  ],
  flask: [
    ...pythonPlatformsIgnores,
    'instance',
    '.webassets-cache'
  ],
  laravel: ['/vendor'],
  netcore: [
    // Source: https://gist.github.com/vmandic/ac2ecc9c24f6899ee0ec46e4ce444a0e
    'Debug',
    'debug',
    'Release',
    'release',
    'Releases',
    'releases',
    'x64',
    'x86',
    'build',
    'bld',
    'Bin',
    'bin',
    'Obj',
    'obj',
  ],
}

function trimLines(lines: string[]): string[] {
  return lines.reduce((prev, line) => {
    if (!line.trim() || line.startsWith('#')) {
      return prev
    }
    return [...prev, line]
  }, [] as string[])
}

const loadIgnoreFile = (ignoreInstance: Ignore, ignoreFilePath: string, projectPath: string) => {
  const patterns: string[] = trimLines(
    fs.readFileSync(ignoreFilePath).toString().split('\n')
  )

  const relativeToProjectPath = patterns.map((pattern: string) => {
    const dir = dirname(ignoreFilePath)
    if (pattern.startsWith('!')) {
      const absolutePrefix = pattern.substr(1).startsWith('/') ? '/' : ''
      return '!' + absolutePrefix + relative(projectPath, join(dir, pattern.substr(1)))
    }
    const absolutePrefix = pattern.startsWith('/') ? '/' : ''
    return absolutePrefix + relative(projectPath, join(dir, pattern))
  })

  ignoreInstance.add(relativeToProjectPath)
}

function addIgnorePatterns(ignoreInstance: Ignore, projectPath: string, dir: string) {
  const liaraignorePath = join(projectPath, dir, '.liaraignore')
  const dockerignorePath = join(projectPath, dir, '.dockerignore')
  const gitignorePath = join(projectPath, dir, '.gitignore')

  if (fs.existsSync(liaraignorePath)) {
    loadIgnoreFile(ignoreInstance, liaraignorePath, projectPath)
  } else if (fs.existsSync(dockerignorePath)) {
    loadIgnoreFile(ignoreInstance, dockerignorePath, projectPath)
  } else if (fs.existsSync(gitignorePath)) {
    loadIgnoreFile(ignoreInstance, gitignorePath, projectPath)
  }
}

export default async function createArchive(archivePath: string, projectPath: string, platform?: string, debug: DebugLogger = () => {}) {
  const ignoreInstance = ignore({ignorecase: false})
  ignoreInstance.add(defaultIgnores)
  // @ts-ignore
  ignoreInstance.add(platformIgnores[platform] || [])

  const ignoreCache: {[dir: string]: boolean} = {}
  const ignoreFN = (f: string) => {
    const dir = dirname(f)
    if( ! ignoreCache[dir]) {
      addIgnorePatterns(ignoreInstance, projectPath, dir)
    } else {
      ignoreCache[dir] = true
    }

    if(!ignoreInstance.ignores(f)) {
      return true
    }
    debug(`ignoring ${f}`)
    return false
  }

  const fileList: string[] = fs.readdirSync(projectPath).filter(ignoreFN);

  return tar.create({
    gzip: {
      level: 9,
    },
    sync: true,
    cwd: projectPath,
    filter: ignoreFN,
    file: archivePath,
  }, fileList)
}
