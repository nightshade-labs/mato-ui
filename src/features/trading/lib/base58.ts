const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return ''

  const digits = [0]
  for (let index = 0; index < bytes.length; index += 1) {
    let carry = bytes[index]
    for (let digitIndex = 0; digitIndex < digits.length; digitIndex += 1) {
      carry += digits[digitIndex] * 256
      digits[digitIndex] = carry % 58
      carry = Math.floor(carry / 58)
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = Math.floor(carry / 58)
    }
  }

  let output = ''
  for (let index = 0; index < bytes.length && bytes[index] === 0; index += 1) {
    output += BASE58_ALPHABET[0]
  }
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    output += BASE58_ALPHABET[digits[index]]
  }
  return output
}
