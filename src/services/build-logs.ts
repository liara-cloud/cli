import axios, { AxiosRequestConfig } from "axios";


import Poller from "../utils/poller";
import { BuildFailed } from "../errors/build-failed";
import { IBuildLogsResponse } from "../types/build-logs-response";
import { BuildCancel } from "../errors/build-cancel";
import { BuildTimeout } from "../errors/build-timeout";
import { DeployException } from "../errors/deploy-exception";
import { ReleaseFailed } from "../errors/release-failed";

export default async (
  releaseID: string,
  isCanceled: boolean,
  axiosConfig: AxiosRequestConfig,
  cb: ({ state, line }: { state: string; line?: string }) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const poller = new Poller();

    let since: string;
    let isDeploying = false;

    poller.onPoll(async () => {
      try {
        const {data: {release, buildOutput}} = await axios.get<IBuildLogsResponse>(
          `/v2/releases/${releaseID}/build-logs`, {
            ...axiosConfig,
            params: {since},
          })

        for (const output of buildOutput) {
          if (output.stream === "STDOUT") {
            cb({ state: "BUILDING", line: output.line });
          } else {
            return reject(new BuildFailed("Build failed", output));
          }
        }

        if (!buildOutput.length) {
          if (release.state === "CANCELED") {
            return reject(new BuildCancel(""));
          }

          if (release.state === "TIMEDOUT") {
            return reject(new BuildTimeout("TIMEOUT"));
          }

          if (release.state === "FAILED") {
            if (release.failReason) {
              return reject(new DeployException(release.failReason));
            }
            return reject(new ReleaseFailed("Release failed."));
          }

          if (release.state === "DEPLOYING" && !isDeploying) {
            isDeploying = true;
            cb({ state: "DEPLOYING" });
          }

          if (release.state === "READY") {
            return resolve();
          }
        }

        if (buildOutput.length) {
          const lastLine = buildOutput[buildOutput.length - 1];
          since = lastLine.createdAt;

          if (lastLine.line.startsWith("Successfully tagged")) {
            cb({ state: "PUSHING" });
          }
        }
      } catch (error) {}

      !isCanceled && poller.poll();
    });

    !isCanceled && poller.poll();
  });
};
