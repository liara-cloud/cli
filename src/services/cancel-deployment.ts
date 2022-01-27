import retry from "async-retry";

export default async (
  httpClient: any,
  releaseID: string,
  retryOptions: {
    retries: number;
    onRetry: (error: any, attempt: number) => void;
  },
  axiosConfig: any
) => {
  await retry(async () => {
    await httpClient.post(
      `/v2/releases/${releaseID}/cancel`,
      null,
      axiosConfig
    );
  }, retryOptions);
};
