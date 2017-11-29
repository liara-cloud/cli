import mri from 'mri';
import { join } from 'path';
import { homedir } from 'os';
import commands from './commands';
import error from './util/error';
import { ensureFileSync } from 'fs-extra';

process.on('uncaughtException', error);
process.on('unhandledRejection', error);

const args = mri(process.argv.slice(2));

// extract first argument as the command name
const [ command ] = args._;

const apiURL = 'api' in args ? args.api : 'http://liara.ir';

// ensure ~/.liara file exists
const liaraConfPath = join(homedir(), '.liara.json');
ensureFileSync(liaraConfPath);

const config = {
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
