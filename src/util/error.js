import { red, white } from 'chalk';

export default function error(error) {
  console.log(red('> Error!'), error);
}