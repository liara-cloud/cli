import ora from 'ora';
import boxen from 'boxen';
import axios from 'axios';
import figures from 'figures';
import { prompt } from 'inquirer';
import showError from '../util/error';
import { cyan, green } from 'chalk';
import auth from '../middlewares/auth';

export default auth(async function deploy(args, config) {
  const { debug } = args;

  const { type } = await prompt({
    type: 'list',
    name: 'type',
    message: 'Select a database to deploy:',
    choices: [{ name: 'MySQL', value: 'mysql' }],
  });

  const spinner = ora(`Deploying ${type}`).start();

  try {
    const body = { type };

    const { data } = await axios.post(`/v1/databases`, body, {
      baseURL: config.apiURL,
      headers: {
        Authorization: `Bearer ${config.api_token}`,
      }
    });

    const { connection: { user, password, host, port, database } } = data;

    spinner.stopAndPersist({
      symbol: green(figures.tick),
      text: 'Database created.'
    });

    const command = `mysql -u ${user} -p${password} -h ${host} -P ${port} ${database}`;
    const url = `mysql://${user}:${password}@${host}:${port}/${database}`;

    console.log();
    console.log(boxen(
`Host: ${cyan(host)}
Port: ${cyan(port)}
User: ${cyan(user)}
Password: ${cyan(password)}
Database Name: ${cyan(database)}`, { padding: 1 }))
    console.log();
    console.log('    Connect via CLI:');
    console.log('        ', cyan(command))
    console.log();
    console.log('    Database URL:');
    console.log('        ', cyan(url));
    console.log();

  } catch(error) {
    // http error
    spinner.clear();
    showError(error.response || error.request ? error.message : error);

    debug && console.error(error);

    process.exit(1);
  }
});
