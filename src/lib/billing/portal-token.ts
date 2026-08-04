import { randomBytes } from 'node:crypto'

/** CSPRNG portal token for family pay links (not Math.random). */
export function newPortalToken(): string {
  return randomBytes(24).toString('base64url')
}

export function appOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, '')}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  }
  return 'http://localhost:3000'
}

export function familyPayUrl(portalToken: string): string {
  return `${appOrigin()}/pay/${encodeURIComponent(portalToken)}`
}
