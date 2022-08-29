import ansiEscapes from 'ansi-escapes'

const eraseLines = (n: number) => ansiEscapes.eraseLines(n)

export default eraseLines
