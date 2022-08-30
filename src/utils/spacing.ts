export function ramSpacing(value: number) {
  const inputLength = value.toString().length;
  return inputLength === 1
    ? ' '.repeat(3)
    : inputLength === 2
    ? ' '.repeat(2)
    : inputLength === 3
    ? ' '
    : '';
}

export function cpuSpacing(value: number) {
  const inputLength = value.toString().length;
  return inputLength === 1
    ? ' '.repeat(4)
    : inputLength === 2
    ? ' '.repeat(3)
    : inputLength === 3
    ? ' '.repeat(2)
    : ' ';
}

export function diskSpacing(value: number) {
  const inputLength = value.toString().length;
  return inputLength === 1
    ? ' '.repeat(3)
    : inputLength === 2
    ? ' '.repeat(2)
    : inputLength === 3
    ? ' '
    : '';
}

export function priceSpacing(value: number) {
  const inputLength = value.toString().length;
  return inputLength === 5
    ? ' '.repeat(4)
    : inputLength === 6
    ? ' '.repeat(3)
    : ' ';
}
