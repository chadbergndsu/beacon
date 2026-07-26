import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import { PRINCIPAL_EMAIL } from '@/lib/roles'

const PRINCIPAL_PASSWORD = 'BeaconPrincipal2026!'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; as?: string }>
}) {
  const params = await searchParams
  const nextPath = params.next && params.next.startsWith('/') ? params.next : '/dashboard'
  const asPrincipal = params.as === 'principal'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center beacon-shell px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        {/* Principal special card */}
        <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-navy via-slate-900 to-sky-900 p-6 text-white shadow-[var(--shadow-lift)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
            Principal access
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">Chris Cowan</h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            A dedicated principal login for reviewing Beacon — full school view of grades,
            announcements, and the transparent parent experience.
          </p>
          {asPrincipal ? (
            <div className="mt-5 rounded-xl bg-white/10 border border-white/10 p-4">
              <LoginForm
                nextPath={nextPath === '/dashboard' ? '/principal' : nextPath}
                defaultEmail={PRINCIPAL_EMAIL}
                defaultPassword={PRINCIPAL_PASSWORD}
                submitLabel="Enter as Principal"
                variant="principal"
              />
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/login?as=principal"
                className="inline-flex rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 transition shadow-lg shadow-sky-500/25"
              >
                Principal sign-in →
              </Link>
              <Link
                href="/about"
                className="inline-flex rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15 transition"
              >
                About Beacon
              </Link>
            </div>
          )}
        </div>

        {/* Standard login */}
        {!asPrincipal && (
          <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] p-8">
            <div className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
                Lighthouse Christian Academy
              </p>
              <h1 className="text-2xl font-bold mt-1 text-navy dark:text-sky-50">Beacon</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Teachers, staff &amp; parents
              </p>
            </div>
            <LoginForm nextPath={nextPath} />
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Built under the direction of Chris Cowan ·{' '}
              <Link href="/about" className="font-medium text-sky-700 hover:underline">
                About Beacon
              </Link>
            </p>
          </div>
        )}

        {asPrincipal && (
          <p className="text-center text-sm">
            <Link href="/login" className="font-medium text-sky-700 hover:underline">
              ← Teacher / parent sign-in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
