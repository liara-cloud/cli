import { Errors } from '@oclif/core';
import { Hooks } from 'got';

const hooks: Hooks = {
  beforeError: [
    (error) => {
      const { response } = error;
      if (response && response.statusCode === 401) {
        console.error(
          new Errors.CLIError(`Authentication failed.
Please login via 'liara login' command.`).render()
        );
        process.exit(2);
      }
      return error;
    },
  ],
};

export default hooks;
