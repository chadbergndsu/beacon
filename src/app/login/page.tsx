import Link from 'next/link'
import { ExternalLink, Shield, UserCog } from 'lucide-react'
import { LoginForm } from '@/components/auth/LoginForm'
import { demoOfficeAdminEmail, demoPrincipalEmail } from '@/lib/roles'
import { safeInternalPath } from '@/lib/safe-redirect'
import { loadSchoolBrand } from '@/lib/school-brand'
import { beaconCraftTourUrl } from '@/lib/beaconcraft-url'
import { CraftHref } from '@/components/craft/CraftHref'

/**
 * Critical CSS keeps the login usable even if the Tailwind chunk fails.
 * Kept in sync with the calm Beacon chrome (navy / primary / white card).
 */
const LOGIN_CRITICAL_CSS = `
  .login-shell {
    min-height: 100dvh;
    min-height: 100vh;
    box-sizing: border-box;
    background: #07111f;
    background-image:
      radial-gradient(ellipse at 20% 10%, rgb(2 132 199 / 0.22), transparent 50%),
      radial-gradient(ellipse at 85% 0%, rgb(14 165 233 / 0.12), transparent 45%),
      linear-gradient(160deg, #06101f 0%, #0a1628 55%, #0c1a2e 100%);
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
    gap: 0.75rem;
    margin: 0 auto 1.5rem;
    max-width: 26rem;
    width: 100%;
  }
  .login-mark {
    display: flex;
    width: 2.75rem;
    height: 2.75rem;
    align-items: center;
    justify-content: center;
    border-radius: 0.75rem;
    background: #0284c7;
    color: #fff;
    font-weight: 700;
    font-size: 1.05rem;
    flex-shrink: 0;
  }
  .login-brand-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 650;
    letter-spacing: -0.025em;
    color: #fff;
    line-height: 1.15;
  }
  .login-brand-sub {
    margin: 0.15rem 0 0;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgb(148 163 184);
  }
  .login-layout {
    width: 100%;
    max-width: 26rem;
    margin: 0 auto;
  }
  @media (min-width: 1024px) {
    .login-layout {
      max-width: 52rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.75rem;
      align-items: stretch;
    }
  }
  .login-story { display: none; }
  @media (min-width: 1024px) {
    .login-story {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      border-radius: 1.25rem;
      border: 1px solid rgb(255 255 255 / 0.08);
      background: rgb(255 255 255 / 0.04);
      padding: 2rem;
      color: #fff;
    }
  }
  .login-story-kicker {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #7dd3fc;
  }
  .login-story h1 {
    margin: 0.65rem 0 0;
    font-size: 2rem;
    line-height: 1.12;
    letter-spacing: -0.03em;
    font-weight: 650;
    color: #fff;
  }
  .login-story p {
    margin: 0.85rem 0 0;
    max-width: 26rem;
    font-size: 0.95rem;
    line-height: 1.55;
    color: #94a3b8;
  }
  .login-story-meta {
    margin-top: 2rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    font-size: 0.8rem;
    color: #64748b;
  }
  .login-story-meta strong {
    color: #e2e8f0;
    font-weight: 600;
  }
  .login-card {
    width: 100%;
    border-radius: 1.25rem;
    background: #ffffff;
    color: #0b1220;
    border: 1px solid rgb(255 255 255 / 0.4);
    box-shadow: 0 20px 50px rgb(2 8 23 / 0.35);
    padding: 1.5rem 1.25rem 1.35rem;
  }
  @media (min-width: 640px) {
    .login-card { border-radius: 1.25rem; padding: 1.75rem 1.75rem 1.5rem; }
  }
  .login-card h1 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 650;
    letter-spacing: -0.025em;
    color: #0b1220;
    line-height: 1.25;
  }
  .login-card .login-card-sub {
    margin: 0.35rem 0 0;
    font-size: 0.875rem;
    color: #5b6b7c;
    line-height: 1.4;
  }
  .login-card form { margin-top: 1.35rem; }
  .login-card label {
    display: block;
    margin-bottom: 0;
    font-size: 0.7rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #5b6b7c;
  }
  .login-card input[type="email"],
  .login-card input[type="password"] {
    width: 100%;
    min-height: 2.75rem;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    padding: 0.65rem 0.9rem;
    font-size: 16px;
    color: #0b1220;
  }
  .login-card button[type="submit"] {
    width: 100%;
    min-height: 2.75rem;
    border: 0;
    border-radius: 0.75rem;
    background: #0284c7;
    color: #fff;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  .login-links {
    margin-top: 1.15rem;
    display: grid;
    gap: 0.5rem;
  }
  .login-link-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    padding: 0.75rem 0.9rem;
    font-size: 0.875rem;
    color: #0b1220;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .login-link-row:hover {
    background: #f0f9ff;
    border-color: #bae6fd;
  }
  .login-link-row span {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #64748b;
  }
  .login-link-row strong {
    display: block;
    margin-top: 0.1rem;
    font-weight: 650;
    color: #0b1220;
  }
  .login-link-row em {
    font-style: normal;
    font-size: 0.8rem;
    font-weight: 600;
    color: #0284c7;
    white-space: nowrap;
  }
  .login-footer {
    margin-top: 1rem;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem 1rem;
    font-size: 0.8125rem;
    line-height: 1.6;
    color: #64748b;
  }
  .login-footer a {
    font-weight: 600;
    color: #0284c7;
    padding: 0.25rem 0.1rem;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  .login-principal-card {
    width: 100%;
    border-radius: 1.25rem;
    background: #ffffff;
    color: #0b1220;
    border: 1px solid rgb(255 255 255 / 0.4);
    box-shadow: 0 20px 50px rgb(2 8 23 / 0.35);
    padding: 1.5rem 1.25rem 1.35rem;
  }
  @media (min-width: 640px) {
    .login-principal-card { padding: 1.75rem; }
  }
  .login-principal-head {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }
  .login-principal-icon {
    display: flex;
    width: 2.5rem;
    height: 2.5rem;
    align-items: center;
    justify-content: center;
    border-radius: 0.75rem;
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
    font-weight: 650;
    letter-spacing: -0.02em;
    color: #0b1220;
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
    color: #0284c7;
  }
`

/** Pilot form prefill only — does not grant role by itself. */
const PILOT_PRINCIPAL_EMAIL = 'principal@lighthouse.test'
const PILOT_OFFICE_ADMIN_EMAIL = 'office@lighthouse.test'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; as?: string }>
}) {
  const params = await searchParams
  const nextPath = safeInternalPath(params.next, '/dashboard')
  const asPrincipal = params.as === 'principal'
  const asOffice = params.as === 'office'
  const brand = await loadSchoolBrand(null)
  const principalEmail = demoPrincipalEmail() || PILOT_PRINCIPAL_EMAIL
  const officeAdminEmail = demoOfficeAdminEmail() || PILOT_OFFICE_ADMIN_EMAIL
  const tourHref = beaconCraftTourUrl()

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LOGIN_CRITICAL_CSS }} />
      <div className="login-shell relative overflow-x-hidden">
        <div className="relative z-10 w-full">
          <Link href="/school" className="login-brand group">
            <span className="login-mark transition group-hover:brightness-110">{brand.logoLetter}</span>
            <span className="min-w-0">
              <p className="login-brand-title truncate">{brand.name}</p>
              <p className="login-brand-sub">Powered by Beacon</p>
            </span>
          </Link>

          <div className="login-layout">
            <aside className="login-story">
              <div>
                <p className="login-story-kicker">{brand.shortName}</p>
                <h1>
                  Sign in to
                  <br />
                  your school.
                </h1>
                <p>
                  Academics, family communication, and school operations for{' '}
                  <strong style={{ color: '#e2e8f0', fontWeight: 600 }}>{brand.name}</strong>.
                </p>
              </div>
              <div className="login-story-meta">
                <span>Teachers · Families · Office</span>
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
                      <p className="kicker">Principal</p>
                      <h2>School leadership</h2>
                      <p>Dedicated office workspace for {brand.name}.</p>
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
              ) : asOffice ? (
                <div className="login-principal-card">
                  <div className="login-principal-head">
                    <div className="login-principal-icon">
                      <UserCog className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="kicker">Office admin</p>
                      <h2>School secretary</h2>
                      <p>
                        Full office workspace for roster, billing, announcements, and campus tools
                        at {brand.name}.
                      </p>
                    </div>
                  </div>
                  <LoginForm
                    nextPath={nextPath === '/dashboard' ? '/principal' : nextPath}
                    defaultEmail={officeAdminEmail}
                    submitLabel="Enter school office"
                    variant="office"
                  />
                  <Link href="/login" className="login-back">
                    ← Staff &amp; parent sign-in
                  </Link>
                </div>
              ) : (
                <div className="login-card">
                  <h1>Sign in</h1>
                  <p className="login-card-sub">
                    Teachers, staff, parents &amp; leadership
                  </p>
                  <LoginForm nextPath={nextPath} />

                  <div className="login-links">
                    <Link href="/login?as=office" className="login-link-row">
                      <span>
                        <span>Office</span>
                        <strong>Secretary / admin sign-in</strong>
                      </span>
                      <em>Continue →</em>
                    </Link>
                    <Link href="/login?as=principal" className="login-link-row">
                      <span>
                        <span>Leadership</span>
                        <strong>Principal sign-in</strong>
                      </span>
                      <em>Continue →</em>
                    </Link>
                  </div>

                  <div className="login-footer">
                    <Link href="/school">School site</Link>
                    {brand.websiteUrl ? (
                      <>
                        <span aria-hidden>·</span>
                        <a
                          href={brand.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1"
                        >
                          Website
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      </>
                    ) : null}
                    <span aria-hidden>·</span>
                    <CraftHref href={tourHref}>Campus tour</CraftHref>
                    <span aria-hidden>·</span>
                    <Link href="/craft" className="font-semibold">
                      Staff twin
                    </Link>
                    <span aria-hidden>·</span>
                    <Link href="/about">About</Link>
                    <span aria-hidden>·</span>
                    <Link href="/privacy">Trust &amp; data practices</Link>
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
