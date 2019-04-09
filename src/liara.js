import mri from 'mri';
import { join } from 'path';
import { homedir } from 'os';
import { readFileSync } from 'fs-extra';
import updateNotifier from 'update-notifier';

import error from './util/error';
import pkg from '../package.json';
import commands from './commands';

updateNotifier({ pkg }).notify();

process.on('uncaughtException', error);
process.on('unhandledRejection', error);

const args = mri(process.argv.slice(2), {
  alias: {
    project: ['p']
  }
});

// extract first argument as the command name
const [ command ] = args._;

let apiURL;
if(args.dev) {
  apiURL = 'http://localhost:3000';
} else {
  apiURL = args.api ? args.api : 'https://api.liara.ir';
}

const liaraConfPath = join(homedir(), '.liara.json');

let liaraConf;
try {
  if(!args['api-token']){
    liaraConf = JSON.parse(readFileSync(liaraConfPath));   
  }else{
    liaraConf = {}
    liaraConf.api_token = args['api-token'];
  }
} catch(err) {
  liaraConf = {};
}

const config = {
  ...liaraConf,
  apiURL,
  liaraConfPath,
};

if( ! command) {
  // no arguments passed, so we should run default command
  commands.deploy(args, config);
} else {
  if( ! (command in commands)) {
    throw new Error(`'${command}' command is not defined.`)
  }

  commands[command](args, config);
}
