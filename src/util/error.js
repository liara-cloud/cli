import { red, white } from 'chalk';

export default function error({ message }) {
  console.log(red('> Error!'), white(message));
}