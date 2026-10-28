const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DEFAULT_LENGTH = 7;

/**
 * Generates a random short code from an unambiguous alphabet (no 0/O/1/l/i)
 * using the Web Crypto API so codes are not predictable.
 */
export function generateShortCode(length = DEFAULT_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

const SHORT_CODE_PATTERN = /^[0-9a-zA-Z]{3,32}$/;

export function isValidShortCodeFormat(code: string): boolean {
  return SHORT_CODE_PATTERN.test(code);
}
