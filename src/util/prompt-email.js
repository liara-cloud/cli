import { green } from 'chalk';
import promptEmail from 'email-prompt';
import { red } from 'chalk';

export default async () => {
  let email

  try {
    email = await promptEmail({ start: `${green('?')} Enter your email: ` });
  } catch (err) {
    console.log(); // \n

    if (err.message === 'User abort') {
      throw new Error(`${red('> Aborted!')} No changes made.`)
    }

    if (err.message === 'stdin lacks setRawMode support') {
      throw new Error(
        error(
          `Interactive mode not supported – please run ${green(
            'liara login --email you@domain.com --password your_password'
          )}`
        )
      )
    }
  }

  console.log(); // \n
  return email;
}