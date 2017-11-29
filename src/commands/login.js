import axios from 'axios';
import retry from 'async-retry';
import { prompt } from 'inquirer';
import { writeFileSync } from 'fs-extra';
import eraseLines from '../util/erase-lines';
import promptEmail from '../util/prompt-email';
import { validate as validateEmail } from 'email-validator';
import { join } from 'path';
import { homedir } from 'os';
import { bold } from 'chalk';

export default async function login(args, config) {
  let email;
  let emailIsValid = false;

  do {
    try {
      email = await promptEmail();
    } catch (err) {
      let erase = '';
      if (err.message.includes('Aborted')) {
        // no need to keep the prompt if the user `ctrl+c`ed
        erase = eraseLines(2);
      }
      console.log(erase + err.message);
      return 1;
    }

    emailIsValid = validateEmail(email);
    if ( ! emailIsValid) {
      // let's erase the `> Enter email [...]`
      // we can't use `console.log()` because it appends a `\n`
      // we need this check because `email-prompt` doesn't print
      // anything if there's no TTY
      process.stdout.write(eraseLines(2));
    }
  } while ( ! emailIsValid);

  const { password } = await prompt({
    name: 'password',
    type: 'password',
    message: 'Enter your password:',
    validate(input) {
      if (input.length === 0) {
        return false;
      }
      return true;
    }
  });

  const { api_token } = await retry(async bail => {
    try {
      const { data } = await axios.post('/api/v1/login', { email, password }, {
        baseURL: config.apiURL,
      });
      return data;
    }
    catch(err) {
      if(err.status === 401) {
        bail(err);
      }
      throw err;
    }
  });

  const liaraConfPath = join(homedir(), '.liara.json');
  writeFileSync(liaraConfPath, JSON.stringify({
    api_token,
  }));

  console.log(`Auth credentials saved in ${bold(liaraConfPath)}.`);
}
