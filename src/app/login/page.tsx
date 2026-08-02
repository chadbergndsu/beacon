import Link from 'next/link'
import { ExternalLink, Shield } from 'lucide-react'
import { LoginForm } from '@/components/auth/LoginForm'
import { demoPrincipalEmail } from '@/lib/roles'
import { safeInternalPath } from '@/lib/safe-redirect'
import { loadSchoolBrand } from '@/lib/school-brand'

/**
 * Critical CSS keeps the login usable even if the Tailwind chunk fails.
 */
const LOGIN_CRITICAL_CSS = `
  .login-shell {
    min-height: 100dvh;
    min-height: 100vh;
    box-sizing: border-box;
    background: linear-gradient(145deg, #06101f 0%, #0b1f3a 48%, #0c4a6e 100%);
    color: #f8fafc;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding: max(1rem, env(safe-area-inset-top, 0px)) 1rem max(1.5rem, env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .login-shell *,
  .login-shell *::before,
  .login-shell *::after { box-sizing: border-box; }
  .login-shell a { color: inherit; text-decoration: none; }
  .login-brand {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin: 0 auto 1.25rem;
    max-width: 26rem;
    width: 100%;
  }
  .login-mark {
    display: flex;
    width: 2.75rem;
    height: 2.75rem;
    align-items: center;
    justify-content: center;
    border-radius: 0.9rem;
    background: #0ea5e9;
    color: #fff;
    font-weight: 800;
    font-size: 1.05rem;
    box-shadow: 0 10px 28px rgb(14 165 233 / 0.35);
    flex-shrink: 0;
  }
  .login-brand-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #fff;
    line-height: 1.2;
  }
  .login-brand-sub {
    margin: 0.1rem 0 0;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgb(125 211 252 / 0.9);
  }
  .login-layout {
    width: 100%;
    max-width: 26rem;
    margin: 0 auto;
  }
  @media (min-width: 1024px) {
    .login-layout {
      max-width: 56rem;
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 1.5rem;
      align-items: stretch;
    }
  }
  .login-story { display: none; }
  @media (min-width: 1024px) {
    .login-story {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 1.5rem;
      border: 1px solid rgb(255 255 255 / 0.12);
      background: rgb(255 255 255 / 0.05);
      padding: 2.25rem;
      color: #fff;
      backdrop-filter: blur(12px);
    }
  }
  .login-story-kicker {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #7dd3fc;
  }
  .login-story h1 {
    margin: 0.75rem 0 0;
    font-size: 2.15rem;
    line-height: 1.15;
    letter-spacing: -0.03em;
    font-weight: 700;
    color: #fff;
  }
  .login-story p {
    margin: 1rem 0 0;
    max-width: 28rem;
    font-size: 1rem;
    line-height: 1.6;
    color: #cbd5e1;
  }
  .login-story-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 2rem;
  }
  .login-story-grid div {
    border-radius: 1rem;
    border: 1px solid rgb(255 255 255 / 0.1);
    background: rgb(255 255 255 / 0.06);
    padding: 0.75rem;
  }
  .login-story-grid strong {
    display: block;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #7dd3fc;
  }
  .login-story-grid span {
    display: block;
    margin-top: 0.35rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(255 255 255 / 0.92);
  }
  .login-card {
    width: 100%;
    border-radius: 1.25rem;
    background: #ffffff;
    color: #0b1220;
    border: 1px solid rgb(255 255 255 / 0.55);
    box-shadow: 0 24px 60px rgb(2 8 23 / 0.35);
    padding: 1.35rem 1.25rem 1.5rem;
  }
  @media (min-width: 640px) {
    .login-card { border-radius: 1.5rem; padding: 2rem; }
  }
  .login-card h1 {
    margin: 0;
    text-align: center;
    font-size: 1.4rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #0a1628;
    line-height: 1.25;
  }
  .login-card .login-card-sub {
    margin: 0.4rem 0 0;
    text-align: center;
    font-size: 0.875rem;
    color: #5b6b7c;
  }
  .login-card form { margin-top: 1.35rem; display: grid; gap: 1rem; }
  .login-card label {
    display: block;
    margin-bottom: 0.4rem;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #5b6b7c;
  }
  .login-card input[type="email"],
  .login-card input[type="password"] {
    width: 100%;
    min-height: 2.85rem;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    padding: 0.65rem 0.9rem;
    font-size: 16px;
    color: #0b1220;
  }
  .login-card button[type="submit"] {
    width: 100%;
    min-height: 3rem;
    border: 0;
    border-radius: 0.75rem;
    background: linear-gradient(180deg, #0ea5e9, #0284c7);
    color: #fff;
    font-size: 0.95rem;
    font-weight: 650;
    cursor: pointer;
    box-shadow: 0 10px 24px rgb(2 132 199 / 0.25);
  }
  .login-principal {
    margin-top: 1.15rem;
    border-radius: 1rem;
    border: 1px solid #e0f2fe;
    background: linear-gradient(160deg, #f0f9ff, #ffffff);
    padding: 0.95rem 1rem;
  }
  .login-principal strong {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #0369a1;
  }
  .login-principal p {
    margin: 0.3rem 0 0;
    font-size: 0.875rem;
    color: #5b6b7c;
    line-height: 1.4;
  }
  .login-principal a {
    display: inline-flex;
    margin-top: 0.55rem;
    font-size: 0.875rem;
    font-weight: 650;
    color: #0369a1;
  }
  .login-footer {
    margin-top: 1.15rem;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.35rem 0.75rem;
    font-size: 0.75rem;
    color: #5b6b7c;
  }
  .login-footer a { font-weight: 600; color: #0369a1; }
  .login-principal-card {
    width: 100%;
    border-radius: 1.25rem;
    background: #ffffff;
    color: #0b1220;
    border: 1px solid rgb(56 189 248 / 0.25);
    box-shadow: 0 24px 60px rgb(2 8 23 / 0.35);
    padding: 1.35rem 1.25rem 1.5rem;
  }
  @media (min-width: 640px) {
    .login-principal-card { border-radius: 1.5rem; padding: 2rem; }
  }
  .login-principal-head {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }
  .login-principal-icon {
    display: flex;
    width: 2.75rem;
    height: 2.75rem;
    align-items: center;
    justify-content: center;
    border-radius: 0.9rem;
    background: #0a1628;
    color: #fff;
    flex-shrink: 0;
  }
  .login-principal-head .kicker {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 650;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #0284c7;
  }
  .login-principal-head h2 {
    margin: 0.15rem 0 0;
    font-size: 1.2rem;
    font-weight: 700;
    color: #0a1628;
  }
  .login-principal-head p {
    margin: 0.3rem 0 0;
    font-size: 0.875rem;
    color: #5b6b7c;
    line-height: 1.4;
  }
  .login-back {
    display: block;
    margin-top: 1.15rem;
    text-align: center;
    font-size: 0.875rem;
    font-weight: 600;
    color: #0369a1;
  }
`

/** Pilot form prefill only — does not grant role by itself. */
const PILOT_PRINCIPAL_EMAIL = 'principal@lighthouse.test'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; as?: string }>
}) {
  const params = await searchParams
  const nextPath = safeInternalPath(params.next, '/dashboard')
  const asPrincipal = params.as === 'principal'
  const brand = await loadSchoolBrand(null)
  const principalEmail = demoPrincipalEmail() || PILOT_PRINCIPAL_EMAIL

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LOGIN_CRITICAL_CSS }} />
      <div className="login-shell relative overflow-x-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden opacity-50"
        >
          <div className="mobile-safe-blur absolute -left-10 top-0 h-40 w-40 rounded-full bg-sky-500/30 blur-3xl sm:h-72 sm:w-72" />
          <div className="mobile-safe-blur absolute bottom-0 right-0 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl sm:h-80 sm:w-80" />
        </div>

        <div className="relative z-10 w-full">
          <Link href="/school" className="login-brand group">
            <span className="login-mark transition group-hover:scale-105">{brand.logoLetter}</span>
            <span>
              <p className="login-brand-title">Beacon</p>
              <p className="login-brand-sub">School suite · {brand.shortName}</p>
            </span>
          </Link>

          <div className="login-layout">
            <aside className="login-story">
              <div>
                <p className="login-story-kicker">One platform</p>
                <h1>
                  Academics. Families.
                  <br />
                  Operations. Clarity.
                </h1>
                <p>
                  Beacon is the full school suite for <strong>{brand.name}</strong> — transparent
                  grades, family communication, principal office, and QuickBooks-ready tuition.
                  Built for any school that wants one clear system.
                </p>
              </div>
              <div className="login-story-grid">
                {[
                  { k: 'Academics', v: 'Transparent grades' },
                  { k: 'Families', v: 'Comms & portal' },
                  { k: 'Office', v: 'Tuition & QB' },
                ].map((item) => (
                  <div key={item.k}>
                    <strong>{item.k}</strong>
                    <span>{item.v}</span>
                  </div>
                ))}
              </div>
            </aside>

            <div className="w-full min-w-0">
              {asPrincipal ? (
                <div className="login-principal-card">
                  <div className="login-principal-head">
                    <div className="login-principal-icon">
                      <Shield className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="kicker">Principal access</p>
                      <h2>School leadership</h2>
                      <p>Dedicated principal workspace for {brand.name}.</p>
                    </div>
                  </div>
                  <LoginForm
                    nextPath={nextPath === '/dashboard' ? '/principal' : nextPath}
                    defaultEmail={principalEmail}
                    submitLabel="Enter principal office"
                    variant="principal"
                  />
                  <Link href="/login" className="login-back">
                    ← Staff &amp; parent sign-in
                  </Link>
                </div>
              ) : (
                <div className="login-card">
                  <h1>Sign in to Beacon</h1>
                  <p className="login-card-sub">
                    Teachers, staff, parents &amp; leadership · {brand.shortName}
                  </p>
                  <LoginForm nextPath={nextPath} />

                  <div className="login-principal">
                    <strong>Principal</strong>
                    <p>Open the dedicated office workspace for school leadership.</p>
                    <Link href="/login?as=principal">Principal sign-in →</Link>
                  </div>

                  <div className="login-footer">
                    <Link href="/school">School site</Link>
                    {brand.websiteUrl && (
                      <>
                        <span aria-hidden>·</span>
                        <a
                          href={brand.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1"
                        >
                          School website
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      </>
                    )}
                    <span aria-hidden>·</span>
                    <Link href="/about">About Beacon</Link>
                    <span aria-hidden>·</span>
                    <Link href="/privacy">Privacy</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
