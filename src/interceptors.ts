import { Errors } from '@oclif/core';
import { Hooks } from 'got';

const hooks: Partial<Hooks> = {
  beforeError: [
    (error) => {
      const { response } = error;
      if (response && response.statusCode === 401) {
        console.error(
          new Errors.CLIError(`Authentication failed.
Please log in using the 'liara login' command.

If you are using an API token for authentication, please consider updating your API token.`).render(),
        );
        process.exit(2);
      }

      return error;
    },
  ],
};

export default hooks;
