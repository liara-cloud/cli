import Command from '../src/base';
import { Config } from '@oclif/core';

class TestGotRequest extends Command {
  async run() {
    await this.setGotConfig({ region: 'iran', 'api-token': 'test' });
    return this.got;
  }
}

test('http configuration', async () => {
  const configs = await new TestGotRequest([], {} as Config).run();
  console.log(configs.defaults.options);
  expect(configs.defaults.options.timeout.request).toBe(10000);
  expect(configs.defaults.options.headers.authorization).toBe('Bearer test');
  expect(configs.defaults.options.prefixUrl).toBe('https://api.liara.ir/');
});
