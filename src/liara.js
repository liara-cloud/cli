import mri from 'mri';
import chalk from 'chalk';
import fs from 'fs-extra';
import help from './config/help';
import commands from './commands';
import { homedir } from 'os';

process.on('uncaughtException', error => {
  console.log(chalk.red('> Error!'), chalk.white(error.message))
});

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
