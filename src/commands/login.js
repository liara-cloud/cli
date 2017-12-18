import axios from 'axios';
import retry from 'async-retry';
import { prompt } from 'inquirer';
import { writeFileSync } from 'fs-extra';
import eraseLines from '../util/erase-lines';
import promptEmail from '../util/prompt-email';
import { validate as validateEmail } from 'email-validator';
import { green, red, bold } from 'chalk';

// @TODO Add support for --email and --password args

export default async function login(args, config) {
  const { debug } = args;

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
      return false;
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

  try {
    const { api_token } = await retry(async bail => {
      try {
        const { data } = await axios.post('/v1/login', { email, password }, {
          baseURL: config.apiURL,
        });
        return data;
      }
      catch(err) {
        if(err.response.status === 401) {
          return bail(err);
        }
        debug && console.log('[debug] retrying...');
        throw err;
      }
    });

    writeFileSync(config.liaraConfPath, JSON.stringify({
      api_token,
    }));

    console.log(`> Auth credentials saved in ${bold(config.liaraConfPath)}`);

    console.log(green('You have logged in successfully.'));

  } catch(err) {
    if(err.response && err.response.status === 401) {
      console.error(`${red('> Error!')} Authentication failed. Please try again.`);
      return false;
    }
    throw err;
  }

  return true;
}
