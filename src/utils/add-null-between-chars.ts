function addNullBetweenChars(input: string): Buffer {
  const buffer = Buffer.alloc(input.length * 2 - 1);
  let offset = 0;

  for (let i = 0; i < input.length; i++) {
    buffer.write(input.charAt(i), offset);
    // if current character is not the last one, write a null character after it
    if (i !== input.length - 1) {
      offset++;
      buffer.write('\0', offset);
      offset++;
    }
  }

  return buffer;
}

export default addNullBetweenChars;
