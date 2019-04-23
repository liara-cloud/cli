export default function validatePort(input: any): string | true {
  input = Number(input)
  if (!input) {
    return 'Port must be a number.'
  }
  if (!Number.isInteger(input) || input < 0) {
    return 'Port must be an integer, greater than zero.'
  }
  return true
}
