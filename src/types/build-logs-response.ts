import IRelease from './release'
import IBuildOutput from './build-output'

export default interface IBuildLogsResponse {
  release: IRelease,
  buildOutput: IBuildOutput[],
}