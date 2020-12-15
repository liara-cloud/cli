import path from 'path'
import countBy from 'lodash.countby'

export interface IFile {
  checksum: string,
  path: string,
  size: number,
  mode: number,
}

export default function listHugeDirs(files: IFile[]) {
  return Object.entries(countBy(files, file => path.dirname(file.path).split('/')[0]))
    .filter(item => item[1] >= 100)
}
