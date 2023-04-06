import IRelease from './release.js';
import IBuildOutput from './build-output.js';

export default interface IBuildLogsResponse {
  release: IRelease;
  buildOutput: IBuildOutput[];
}
