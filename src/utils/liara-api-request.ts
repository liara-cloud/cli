import { Got } from 'got';
import retry from 'async-retry';

import { DebugLogger } from './output';
import { FALLBACK_REGION } from '../constants';

const RETRIES = 3;

class Liara {
  httpClient: Got;
  debug: DebugLogger;

  constructor(httpClient: Got, debug: DebugLogger) {
    this.debug = debug;
    this.httpClient = httpClient;
  }

  async me(options: Record<string, any>) {
    const {
      user: { email, avatar, fullname },
    } = (await retry(
      async () => {
        try {
          return await this.httpClient
            .get('v1/me', {
              headers: {
                Authorization: `Bearer ${options.api_token}`,
              },
            })
            .json();
        } catch (error) {
          this.debug('retrying...');
          throw error;
        }
      },
      { retries: RETRIES }
    )) as Record<string, any>;

    return {
      email,
      avatar,
      fullname,
      current: false,
      region: options.region || FALLBACK_REGION,
      api_token: options.api_token,
    };
  }

  async login(options: Record<string, any>) {
    const { fullname, avatar, api_token } = (await retry(async () => {
      try {
        return await this.httpClient
          .post('v1/login', {
            json: options.body,
          })
          .json<Record<string, any>>();
      } catch (error) {
        this.debug('retrying...');
        throw error;
      }
    })) as Record<string, any>;

    return {
      fullname,
      avatar,
      api_token,
      current: false,
      email: options.body.email,
      region: options.region || FALLBACK_REGION,
    };
  }
}

export default Liara;
