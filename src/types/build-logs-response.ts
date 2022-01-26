import {IRelease} from './release'
import {IBuildOutput} from './build-output'

export interface IBuildLogsResponse {
  release: IRelease,
  buildOutput: IBuildOutput[],
}