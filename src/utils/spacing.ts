export default function spacing(maxLength: number, value: number) {
  const inputLength = value.toString().length;

  return inputLength === 1
    ? ' '.repeat(maxLength)
    : inputLength === maxLength
    ? ' '.repeat(1)
    : ' '.repeat(maxLength + 1 - inputLength);
}
