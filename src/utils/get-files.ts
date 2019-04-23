import hash from './hash'
import ignore, {Ignore} from 'ignore'
import klaw from 'klaw'
import fs from 'fs-extra'
import through2 from 'through2'
import {DebugLogger} from './output'
import {resolve, relative, join, dirname} from 'path'

const mode755 = 16893
const mode644 = 33204
const defaultIgnores: string[] = [
  '.git',
  '.idea',
  '.vscode',
  '.gitignore',
  '.liaraignore',
  '.dockerignore',
  '*.*~',
  'node_modules',
  'bower_components',
]

interface IKlawItem {
  path: string,
  stats: fs.Stats,
}

export interface IMapItem {
  data: Buffer,
  files: IFile[],
}

export interface IFile {
  checksum: string,
  path: string,
  size: number,
  mode: number,
}

export interface IDirectory {
  path: string,
  mode: number,
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

function addIgnorePatterns(ignoreInstance: Ignore, projectPath: string) {
  return through2.obj(function (item, _, next) {
    const liaraignorePath = join(dirname(item.path), '.liaraignore')
    const dockerignorePath = join(dirname(item.path), '.dockerignore')
    const gitignorePath = join(dirname(item.path), '.gitignore')

    if (fs.existsSync(liaraignorePath)) {
      loadIgnoreFile(ignoreInstance, liaraignorePath, projectPath)
    } else if (fs.existsSync(dockerignorePath)) {
      loadIgnoreFile(ignoreInstance, dockerignorePath, projectPath)
    } else if (fs.existsSync(gitignorePath)) {
      loadIgnoreFile(ignoreInstance, gitignorePath, projectPath)
    }

    this.push(item)
    return next()
  })
}

function ignoreFiles(ignoreInstance: Ignore, projectPath: string, debug: DebugLogger) {
  return through2.obj(function (item, _, next) {
    const itemPath = relative(projectPath, item.path)

    if (itemPath) {
      if (!ignoreInstance.ignores(itemPath)) {
        this.push(item)
      } else {
        debug(`ignoring ${item.path.replace(resolve(projectPath) + '/', '')}`)
      }
    }

    return next()
  })
}

async function getFileMode(path: string): Promise<number> {
  try {
    // Is executable?
    await fs.access(path, fs.constants.X_OK)
    return mode755

  } catch {
    // File is not executable.
    return mode644
  }
}

export default async function getFiles(projectPath: string, debug: DebugLogger = () => {}) {
  const mapHashesToFiles = new Map<string, IMapItem>()
  const directories: IDirectory[] = []

  const ignoreInstance = ignore({ignorecase: false})
  ignoreInstance.add(defaultIgnores)

  await new Promise(resolve => {
    let tmpFiles: IKlawItem[] = []

    klaw(projectPath)
      .pipe(addIgnorePatterns(ignoreInstance, projectPath))
      .pipe(ignoreFiles(ignoreInstance, projectPath, debug))
      .on('data', (file: IKlawItem) => tmpFiles.push(file))
      .on('end', async () => {
        await Promise.all(tmpFiles.map(async ({path , stats}) => {
          const filePath = relative(projectPath, path)

          if (!stats.isFile()) {
            const dir: IDirectory = {
              mode: mode755,
              path: filePath,
            }

            return directories.push(dir)
          }

          const data = await fs.readFile(path)
          const checksum = hash(data)
          const file: IFile = {
            checksum,
            path: filePath,
            size: stats.size,
            mode: await getFileMode(filePath),
          }

          if (mapHashesToFiles.has(checksum)) {
            const item = mapHashesToFiles.get(checksum)
            if (!item) return
            mapHashesToFiles.set(checksum, {
              data,
              files: [...item.files, file],
            })
          } else {
            mapHashesToFiles.set(checksum, {
              data,
              files: [file],
            })
          }
        }))

        resolve()
      })
  })

  // flatten files
  const files: IFile[] = Array
    .from(mapHashesToFiles)
    // tslint:disable-next-line: no-unused
    .reduce((prevFiles: IFile[], [_, mapItem]) => {
      return [
        ...prevFiles,
        ...mapItem.files,
      ]
    }, [])

  return {files, directories, mapHashesToFiles}
}
