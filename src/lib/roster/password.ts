/** Temporary passwords for staff/parent invites — readable for handoff, not weak. */

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const NUM = '23456789'
const SYM = '!@#$%'

export function generateTempPassword(length = 12): string {
  const n = Math.max(10, Math.min(24, length))
  const pools = [ALPHA, NUM, SYM]
  const chars: string[] = []
  // Ensure each class is represented
  for (const pool of pools) {
    chars.push(pool[randomInt(pool.length)])
  }
  const all = ALPHA + NUM + SYM
  while (chars.length < n) {
    chars.push(all[randomInt(all.length)])
  }
  // Fisher–Yates
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

function randomInt(max: number): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0] % max
  }
  return Math.floor(Math.random() * max)
}

export function isValidEmail(email: string): boolean {
  const e = email.trim().toLowerCase()
  if (e.endsWith('.test') || e.endsWith('.example') || e.endsWith('.invalid')) {
    // Allow in non-prod? Still valid format for demos — accept format only
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}
