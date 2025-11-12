import { Got } from 'got';
import retry from 'async-retry';

export default async (
  httpClient: Got,
  releaseID: string,
  retryOptions: {
    retries: number;
    onRetry: (error: any, attempt: number) => void;
  },
) => {
  await retry(async () => {
    await httpClient.post(`v2/releases/${releaseID}/cancel`);
  }, retryOptions);
};
