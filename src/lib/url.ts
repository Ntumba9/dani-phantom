const MAX_URL_LENGTH = 2048;

export type UrlValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; error: string };

/**
 * Only http/https destinations are allowed. Rejects javascript:, data:,
 * file:, and any other scheme that could be abused for redirect attacks.
 */
export function validateDestinationUrl(input: string): UrlValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { valid: false, error: "URL is required." };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return { valid: false, error: "URL is too long." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Enter a valid URL, including http(s)://." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "Only http and https URLs are allowed." };
  }

  if (!parsed.hostname) {
    return { valid: false, error: "URL must include a host." };
  }

  return { valid: true, normalized: parsed.toString() };
}
