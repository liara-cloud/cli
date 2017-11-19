import mri from 'mri';
import commands from './commands';
import error from './util/error';

process.on('uncaughtException', error);
process.on('unhandledRejection', error);

const args = mri(process.argv.slice(2));

// extract first argument as the command name
const [ command ] = args._;

const apiUrl = 'api' in args ? args.api : 'http://liara.ir';

if( ! command) {
  // no arguments passed, so we should run default command
  commands.deploy(args);
} else {
  if( ! (command in commands)) {
    throw new Error(`'${command}' command is not defined.`)
  }

  commands[command](args);
}
