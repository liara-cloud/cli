import sinon from 'sinon';
import Command, { IGlobalLiaraConfig } from '../../src/base.ts';

export const API_TOKEN = 'test-token';

export const globalConfig = (): IGlobalLiaraConfig => ({
  version: '1',
  accounts: {
    test: {
      email: 'test@example.com',
      api_token: API_TOKEN,
      region: 'iran',
      fullname: 'Test User',
      avatar: '',
      current: true,
    },
  },
});

// Keeps tests independent of the developer's ~/.liara-auth.json, where a
// selected team or region would change the requests the commands send.
export function stubGlobalConfig(config: IGlobalLiaraConfig = globalConfig()) {
  return sinon.stub(Command.prototype, 'readGlobalConfig').resolves(config);
}

export class ProcessExit extends Error {
  constructor(public code?: number) {
    super(`process.exit(${code})`);
  }
}

// Some commands call process.exit() directly, which would end the test run.
// By default the stub throws so the command stops where it would have exited;
// pass { throws: false } when exit happens inside an event handler.
export function stubProcessExit({ throws = true } = {}) {
  let resolveExit: (code?: number) => void;
  const exited = new Promise<number | undefined>((resolve) => {
    resolveExit = resolve;
  });

  const stub = sinon.stub(process, 'exit').callsFake(((code?: number) => {
    resolveExit(code);
    if (throws) throw new ProcessExit(code);
  }) as typeof process.exit);

  return { stub, exited };
}
