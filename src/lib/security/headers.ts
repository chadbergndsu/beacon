/** Strip CR/LF/control chars from email header values. */
export function sanitizeHeaderValue(raw: string, maxLen = 200): string {
  return raw
    .replace(/[\r\n\0\x08\x1b]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}
