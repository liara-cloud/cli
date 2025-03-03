import got from 'got';
import fs from 'fs-extra';
import { Config } from '@oclif/core';
import Command, { IConfig } from '../src/base';
import {
  GLOBAL_CONF_PATH,
  GLOBAL_CONF_VERSION,
  PREVIOUS_GLOBAL_CONF_PATH,
} from '../src/constants';

// test users credentials
const newContentCredentials = {
  accounts: {
    test1: {
      email: 'test1@gmail.com',
      avatar: '//www.gravatar.com/avatar/b27b143b69933c34caafcce34453f2b3?d=mp',
      region: 'germany',
      current: true,
      fullname: 'test1',
      api_token: 'test-api-token',
    },
    test2: {
      email: 'test2@gmail.com',
      avatar: '//www.gravatar.com/avatar/d44cd1682dd31bf9ef8a5a67ca399bc1?d=mp',
      region: 'iran',
      current: false,
      fullname: 'test2',
      api_token: 'test2-api-token',
    },
  },
  version: '1',
};

const oldContentCredentialsLogin = {
  api_token: 'test-api-token',
  region: 'iran',
  current: null,
};

const oldContentCredentialsAccounts = {
  api_token: 'test-multiaccount-api-token',
  region: 'iran',
  current: null,
  accounts: {
    user1: {
      email: 'userone@gmail.com',
      api_token: 'user1-multiaccount-api-token',
      region: 'iran',
    },
    user2: {
      email: 'usertwo@gmail.com',
      api_token: 'user2-multiaccount-api-token',
      region: 'germany',
    },
  },
};

jest.mock('got');

// mocking config (user credentials) change direcotry to /tmp
jest.mock('../src/constants.ts', () => ({
  get GLOBAL_CONF_PATH() {
    return '/tmp/.liara-auth.json';
  },
  get PREVIOUS_GLOBAL_CONF_PATH() {
    return '/tmp/.liara.json';
  },

  get GLOBAL_CONF_VERSION(): string {
    return '1';
  },

  REGIONS_API_URL: {
    iran: 'https://api.liara.ir',
    germany: 'https://api.liara.ir',
  },
}));

// create files for user credentials in /tmp directory
async function createCredentials(path: string, content: any) {
  // 1) create .liara-auth.json file
  await fs.writeJSON(path, content);
}

class TestConfig extends Command {
  async run() {
    // const {api_token, region} = oldContentCredentialsLogin
    // console.log(
    //   await this.setAxiosConfig({ region: "iran", "api-token": "test" })
    // );
    // console.log(this.axiosConfig);
    this.setGotConfig = (config: IConfig): Promise<void> => {
      return Promise.resolve();
    };

    this.got = got;
    return this.readGlobalConfig();
  }
}

class TestGotRequest extends Command {
  async run() {
    await this.setGotConfig({ region: 'iran', 'api-token': 'test' });
    return this.got;
  }
}
beforeAll(async () => {
  await createCredentials('/tmp/.liara-auth.json', newContentCredentials);
});

describe('reading global configuration', () => {
  test('check if new global path exist', async () => {
    const content = await new TestConfig([], {} as Config).run();

    // check if previous global path not exist any more.
    const previousConfigExists = await fs.pathExists(PREVIOUS_GLOBAL_CONF_PATH);
    expect(previousConfigExists).toBeFalsy();

    // checking content of new config path (.liara-auth.json)
    expect(content.version).toBe(GLOBAL_CONF_VERSION);
    expect(content.accounts).toBeDefined();

    expect(content.accounts.test1.email).toBe(
      newContentCredentials.accounts.test1.email,
    );
    expect(content.accounts.test1.avatar).toBe(
      newContentCredentials.accounts.test1.avatar,
    );
    expect(content.accounts.test1.region).toBe(
      newContentCredentials.accounts.test1.region,
    );
    expect(content.accounts.test1.current).toBe(
      newContentCredentials.accounts.test1.current,
    );
    expect(content.accounts.test1.fullname).toBe(
      newContentCredentials.accounts.test1.fullname,
    );
    expect(content.accounts.test1.api_token).toBe(
      newContentCredentials.accounts.test1.api_token,
    );
    expect(content.accounts.test2.email).toBe(
      newContentCredentials.accounts.test2.email,
    );
    expect(content.accounts.test2.avatar).toBe(
      newContentCredentials.accounts.test2.avatar,
    );
    expect(content.accounts.test2.region).toBe(
      newContentCredentials.accounts.test2.region,
    );
    expect(content.accounts.test2.current).toBe(
      newContentCredentials.accounts.test2.current,
    );
    expect(content.accounts.test2.fullname).toBe(
      newContentCredentials.accounts.test2.fullname,
    );
    expect(content.accounts.test2.api_token).toBe(
      newContentCredentials.accounts.test2.api_token,
    );
  });
  test('not only .liara-auth.json not exists but also .liara.json not exists too', async () => {
    // delete both file credentials first
    fs.removeSync(PREVIOUS_GLOBAL_CONF_PATH);
    fs.removeSync(GLOBAL_CONF_PATH);

    const content = await new TestConfig([], {} as Config).run();
    expect(typeof content.accounts).toBe('object');
    expect(content.accounts).toBeDefined();
    expect(content.version).toBe(GLOBAL_CONF_VERSION);
  });
  test('check if only .liara.json exist and user never add any accounts just login', async () => {
    await createCredentials('/tmp/.liara.json', oldContentCredentialsLogin);
    const data = {
      user: {
        api_token: 'test-api-token-from-server',
        avatar: 'user-avatar',
        fullname: 'test-user-name',
        email: 'testuser@gmail.com',
      },
    };
    //@ts-ignore

    got.get.mockImplementation((path: string, config: GotOptions) => {
      return {
        json() {
          return Promise.resolve({ ...data });
        },
      };
    });

    const content = await new TestConfig([], {} as Config).run();
    const accountName = `${data.user.email.split('@')[0]}_${
      oldContentCredentialsLogin.region
    }`;

    expect(content.version).toBe(GLOBAL_CONF_VERSION);
    expect(content.accounts).toBeDefined();
    expect(content.accounts[accountName]).toBeDefined();
    expect(content.accounts[accountName].api_token).toBe(
      oldContentCredentialsLogin.api_token,
    );
    expect(content.accounts[accountName].region).toBe(
      oldContentCredentialsLogin.region,
    );
    expect(content.accounts[accountName].fullname).toBe(data.user.fullname);
    expect(content.accounts[accountName].email).toBe(data.user.email);
    expect(content.accounts[accountName].avatar).toBe(data.user.avatar);
    expect(content.accounts[accountName].current).toBe(true);
  });
  test('check if only .liara.json exist and user add accounts', async () => {
    const data = {
      user: {
        api_token: 'test-api-token-from-server',
        avatar: 'user-avatar',
        fullname: 'test-user-name',
        email: 'testuser@gmail.com',
      },
    };
    //@ts-ignore
    got.get.mockImplementation((path: string, config: GotOptions) => {
      return {
        json() {
          return Promise.resolve({ ...data });
        },
      };
    });
    await createCredentials('/tmp/.liara.json', oldContentCredentialsAccounts);
    const content = await new TestConfig([], {} as Config).run();

    expect(content.accounts).toBeDefined();
    expect(content.version).toBe(GLOBAL_CONF_VERSION);
    expect(content.accounts['user1']).toBeDefined();
    expect(content.accounts['user2']).toBeDefined();
    expect(content.accounts['user1'].current).toBe(false);
    expect(content.accounts['user1'].avatar).toBe(data.user.avatar);
    expect(content.accounts['user1'].fullname).toBe(data.user.fullname);
    expect(content.accounts['user1'].api_token).toBe(
      oldContentCredentialsAccounts.accounts.user1.api_token,
    );
    expect(content.accounts['user1'].email).toBe(data.user.email);
    expect(content.accounts['user1'].region).toBe(
      oldContentCredentialsAccounts.accounts.user1.region,
    );
    expect(content.accounts['user2'].current).toBe(false);
    expect(content.accounts['user2'].avatar).toBe(data.user.avatar);
    expect(content.accounts['user2'].fullname).toBe(data.user.fullname);
    expect(content.accounts['user2'].api_token).toBe(
      oldContentCredentialsAccounts.accounts.user2.api_token,
    );
    expect(content.accounts['user2'].email).toBe(data.user.email);
    expect(content.accounts['user2'].region).toBe(
      oldContentCredentialsAccounts.accounts.user2.region,
    );
  });
});
