import crypto from 'crypto'

export default (buf: Buffer) => {
  return crypto.createHash('sha256').update(buf).digest('hex')
}
