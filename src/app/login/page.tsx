import Link from 'next/link'
import { ExternalLink, Shield } from 'lucide-react'
import { LoginForm } from '@/components/auth/LoginForm'
import { PRINCIPAL_EMAIL } from '@/lib/roles'
import { safeInternalPath } from '@/lib/safe-redirect'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; as?: string }>
}) {
  const params = await searchParams
  const nextPath = safeInternalPath(params.next, '/dashboard')
  const asPrincipal = params.as === 'principal'

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Cinematic background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#06101f] via-[#0b1f3a] to-[#0c4a6e]" />
      <div className="absolute inset-0 opacity-40">
        <div className="absolute -left-24 top-0 h-[28rem] w-[28rem] rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mb-10 text-center sm:text-left">
          <Link href="/school" className="inline-flex items-center gap-2.5 group">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-base font-black text-white shadow-xl shadow-sky-500/30 group-hover:scale-105 transition">
              B
            </span>
            <div className="text-left">
              <p className="text-lg font-bold tracking-tight text-white">Beacon</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/90">
                School suite · Lighthouse Christian Academy
              </p>
            </div>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          {/* Brand panel */}
          <div className="hidden lg:flex flex-col justify-between rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-10 text-white backdrop-blur-md shadow-2xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                One platform
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight leading-[1.15]">
                Academics. Families.
                <br />
                Operations. Clarity.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300">
                Beacon is LCA&apos;s full school suite — transparent grades, family communication,
                principal office, and QuickBooks-ready tuition. Built for Lighthouse under Chris
                Cowan&apos;s direction.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { k: 'Academics', v: 'Transparent grades' },
                { k: 'Families', v: 'Comms & portal' },
                { k: 'Office', v: 'Tuition & QB' },
              ].map((item) => (
                <div
                  key={item.k}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
                    {item.k}
                  </p>
                  <p className="mt-1 text-sm font-medium text-white/90">{item.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Auth card */}
          <div className="space-y-4">
            {asPrincipal ? (
              <div className="rounded-[1.75rem] border border-sky-400/20 bg-white p-8 shadow-2xl shadow-sky-900/20 dark:bg-slate-900">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy text-white">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
                      Principal access
                    </p>
                    <h2 className="text-xl font-bold text-navy dark:text-sky-50">Chris Cowan</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Dedicated principal workspace for the full Beacon suite.
                    </p>
                  </div>
                </div>
                <LoginForm
                  nextPath={nextPath === '/dashboard' ? '/principal' : nextPath}
                  defaultEmail={PRINCIPAL_EMAIL}
                  submitLabel="Enter principal office"
                  variant="principal"
                />
                <p className="mt-5 text-center text-sm">
                  <Link href="/login" className="font-medium text-sky-700 hover:underline">
                    ← Staff &amp; parent sign-in
                  </Link>
                </p>
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-white/60 bg-white/95 p-8 shadow-2xl shadow-slate-900/20 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
                <div className="mb-6 text-center">
                  <h1 className="text-2xl font-bold tracking-tight text-navy dark:text-sky-50">
                    Sign in to Beacon
                  </h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Teachers, staff, parents &amp; leadership
                  </p>
                </div>
                <LoginForm nextPath={nextPath} />

                <div className="mt-6 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 dark:from-sky-950/40 dark:to-slate-900 dark:border-sky-900">
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                    Principal
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Chris — open your dedicated office workspace.
                  </p>
                  <Link
                    href="/login?as=principal"
                    className="mt-3 inline-flex text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300"
                  >
                    Principal sign-in →
                  </Link>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <Link href="/school" className="font-medium text-sky-700 hover:underline">
                    School site
                  </Link>
                  <span aria-hidden>·</span>
                  <a
                    href="https://lcadawsonville.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline"
                  >
                    lcadawsonville.com
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span aria-hidden>·</span>
                  <Link href="/about" className="font-medium text-sky-700 hover:underline">
                    About Beacon
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
