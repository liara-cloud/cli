import { red, white } from 'chalk';

export default function error(err) {
  console.log(red('> Error!'), err);
}