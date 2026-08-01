/**
 * QuickBooks Online integration helpers (Intuit OAuth 2.0).
 * Tokens are never stored client-side. Connection UI uses these env vars:
 *
 *   INTUIT_CLIENT_ID
 *   INTUIT_CLIENT_SECRET
 *   INTUIT_REDIRECT_URI  (e.g. https://your-app.vercel.app/api/quickbooks/callback)
 *   INTUIT_ENVIRONMENT   (sandbox | production)
 */

export function getQuickBooksConfig() {
  const clientId = process.env.INTUIT_CLIENT_ID || ''
  const clientSecret = process.env.INTUIT_CLIENT_SECRET || ''
  const redirectUri =
    process.env.INTUIT_REDIRECT_URI ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/quickbooks/callback`
      : 'http://localhost:3000/api/quickbooks/callback')
  const environment =
    (process.env.INTUIT_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'

  const authBase =
    environment === 'production'
      ? 'https://appcenter.intuit.com/connect/oauth2'
      : 'https://appcenter.intuit.com/connect/oauth2'

  return {
    clientId,
    clientSecret,
    redirectUri,
    environment,
    authBase,
    configured: Boolean(clientId && clientSecret),
  }
}

export function isQuickBooksConfigured(): boolean {
  return getQuickBooksConfig().configured
}

/** Build Intuit OAuth authorize URL for principal Connect flow. */
export function buildQuickBooksAuthorizeUrl(state: string) {
  const cfg = getQuickBooksConfig()
  if (!cfg.configured) {
    return null
  }

  const scopes = [
    'com.intuit.quickbooks.accounting',
    'openid',
    'profile',
    'email',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: scopes,
    state,
  })

  return `${cfg.authBase}?${params.toString()}`
}

/**
 * Exchange authorization code for tokens (server-only).
 * Called from /api/quickbooks/callback when Intuit redirects back.
 */
export async function exchangeQuickBooksCode(code: string, realmId: string) {
  const cfg = getQuickBooksConfig()
  if (!cfg.configured) {
    throw new Error('QuickBooks is not configured (missing INTUIT_CLIENT_ID/SECRET).')
  }

  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')
  const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error_description || data?.error || 'Token exchange failed')
  }

  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
    realmId,
  }
}
