import ora from 'ora';
import axios from 'axios';

import auth from '../middlewares/auth';

export default auth(async function deploy(args, config) {
  const { project } = args;

  if(! project || typeof project != String || project.length <= 0) {
    console.error('\tError: please enter a project id\n\tExp -> liara logs --project myproject id');
    process.exit(1);
  }

  console.log('-> Preparing Logs for ' + project + '...\n\n');

  const { data } = await axios.get('/v1/projects/' + project + '/logs', {
    baseURL: config.apiURL,
    headers: {
      Authorization: `Bearer ${config.api_token}`,
    }
  });
  if (data)
    data.forEach(row => {
      console.log(row.datetime + ': ' + row.message);
    });
  else
    console.error('Cant connect to server');
});