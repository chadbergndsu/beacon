import { parseScannerInput } from './codes'

/** Minimum code length for public kiosk / badge scan (after normalize). */
export const MIN_SCAN_CODE_LEN = 4

/**
 * Public kiosk must supply a physical badge/QR/RFID code — not studentId alone.
 */
export function publicKioskScanCode(
  rawCode: string | null | undefined
): { ok: true; code: string } | { ok: false; error: string } {
  const code = parseScannerInput(rawCode || '')
  if (!code || code.length < MIN_SCAN_CODE_LEN) {
    return {
      ok: false,
      error: 'Scan a badge, QR code, or RFID. Name search is only available for staff login.',
    }
  }
  return { ok: true, code }
}

/** Staff desk may use raw code and/or studentId name-tap. */
export function staffScanIdentity(input: {
  rawCode?: string | null
  studentId?: string | null
}): { ok: true } | { ok: false; error: string } {
  if (!input.rawCode?.trim() && !input.studentId?.trim()) {
    return { ok: false, error: 'Scan a badge or pick a student.' }
  }
  if (input.rawCode?.trim()) {
    const code = parseScannerInput(input.rawCode)
    if (code && code.length < MIN_SCAN_CODE_LEN) {
      return { ok: false, error: 'Scan a valid badge or RFID code.' }
    }
  }
  return { ok: true }
}
