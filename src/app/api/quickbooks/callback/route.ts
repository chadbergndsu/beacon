import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeQuickBooksCode } from '@/lib/billing/quickbooks'
import { updateQuickBooks } from '@/lib/billing/store'
import { effectiveRole } from '@/lib/roles'

/**
 * Intuit OAuth redirect target.
 * Configure this exact URL in the Intuit Developer app:
 *   https://<your-domain>/api/quickbooks/callback
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const realmId = url.searchParams.get('realmId')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const fail = (msg: string) =>
    NextResponse.redirect(
      new URL(`/principal/payments?error=${encodeURIComponent(msg)}`, url.origin)
    )

  if (error) return fail(error)
  if (!code || !realmId || !state) return fail('Missing OAuth parameters from QuickBooks.')

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail('Sign in as principal before connecting QuickBooks.')

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('id, school_id, role, email, full_name')
      .eq('id', user.id)
      .maybeSingle()

    const role = effectiveRole(profile)
    if (!profile?.school_id || (role !== 'principal' && role !== 'admin')) {
      return fail('Only the principal can complete QuickBooks connection.')
    }

    const { verifyOAuthState } = await import('@/lib/security/oauth-state')
    const verified = verifyOAuthState(state)
    if (!verified.ok) return fail(verified.error)
    const parsed = verified.payload
    if (parsed.schoolId !== profile.school_id) {
      return fail('School mismatch in OAuth state.')
    }
    if (parsed.userId !== user.id) {
      return fail('User mismatch in OAuth state.')
    }

    const tokens = await exchangeQuickBooksCode(code, realmId)
    const expiresAt = new Date(
      Date.now() + (tokens.expiresIn || 3600) * 1000
    ).toISOString()

    // Vault tokens on quickbooks_connections (never returned to client via loadBillingState)
    await updateQuickBooks(profile.school_id, {
      status: 'connected',
      environment: (process.env.INTUIT_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      realmId,
      companyName: `QuickBooks Company ${realmId.slice(0, 6)}…`,
      connectedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
      lastError: null,
      connectedByName: profile.full_name,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: expiresAt,
      connectedBy: user.id,
    })

    await admin.from('audit_logs').insert({
      school_id: profile.school_id,
      user_id: user.id,
      action: 'quickbooks.connected',
      table_name: 'quickbooks_connections',
      details: {
        realmId,
        expiresIn: tokens.expiresIn,
        tokensVaulted: true,
      },
    })

    return NextResponse.redirect(
      new URL('/principal/payments?connected=1', url.origin)
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'QuickBooks connection failed'
    return fail(msg)
  }
}
