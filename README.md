# Beacon

**The full school suite for any school** — academics, family communications, principal operations, and payments.

Multi-tenant by design: each `schools` row carries its own name, branding, roster, and settings. JupiterEd familiarity where it helps teachers, cleaner than Blackbaud where families need clarity.

This repo follows **[Solid Systems Standards](https://github.com/chadbergndsu/solid-systems-standards)** — see `AGENTS.md` (global standards template). **Beacon-specific setup and truth live in this README** and `.env.example`.

## Stack

| Layer | Choice | Notes |
|-------|--------|--------|
| App | Next.js 16 App Router + React 19 + TypeScript + Tailwind 4 | Portable web frontend |
| Auth edge | `src/proxy.ts` → Supabase SSR session | Public routes listed below; fail-closed without Supabase env on prod/preview |
| DB | Supabase Postgres | Schema owned in `supabase/migrations/` (**001–018**) |
| Auth | Supabase Auth | App code uses `getUser()` before service-role; edge refreshes cookies via `getClaims()` |
| Host | Vercel + HTTPS | Default per Solid Systems |
| Email | Resend and/or SMTP (cascade) | Log-only outbox without live transport; never use `onboarding@resend.dev` in prod |
| Billing | QuickBooks OAuth (optional) | Tokens on `quickbooks_connections`; invoices/payments **local** until live Intuit posting |
| Cameras | hls.js + go2rtc/MediaMTX URLs | Stored in `schools.settings` modules JSON (no dedicated camera table) |
| SMS | Twilio (optional) | Aftercare parent notify |
| Rate limits | In-memory; Upstash optional | Kiosk / device / login |

## Architecture (short)

- **Multi-tenant:** `schools` + `school_id` on roster/grades; brand in `schools.settings.brand`
- **Academics:** core tables (`classes`, `assignments`, `grades`, …)
- **Suite modules (007):** prefer tables for attendance, lessons, pulse, videos; **JSON fallback** only if those tables are missing. **Cameras always stay in settings JSON.**
- **Billing (006 + 017):** `billing_products` / `billing_invoices` / `billing_payments` / `quickbooks_connections` only — **no** `schools.settings.billing` money path
- **Communications:** `email_outbox` + Resend→SMTP→log cascade; every attempt recorded
- **Ops:** Principal Go-live UI (`probeOpsHealth`) + public `GET /api/health` (see Health below)

### Public (unauthenticated) routes

Exact allowlist in `src/lib/supabase/proxy.ts`: `/`, `/login`, `/about`, `/school`, `/privacy`, `/kiosk`, `/kiosk/*`, `/api/kiosk/*`, `/api/health`.

**Not public:** `/api/quickbooks/callback` requires an existing principal/admin session (Intuit redirect after Connect).

## Modules

| Area | What it does |
|------|----------------|
| **Academics** | Grade entry, lesson plans, transparent parent views, CSV export, report cards |
| **Attendance** | Daily roster with optional parent absent/tardy email |
| **Beacon Pulse** | Whole-child check-ins (unique to Beacon) |
| **Dinner Table Digest** | 60-second plain-English parent story + conversation starters (unique) |
| **Conference Brief** | One-page PTC sheet from grades + pulse + attendance (unique) |
| **Beacon Signal** | Principal school climate heart-rate + pastoral watch list (unique) |
| **Communications** | Compose to families, announcements, Dinner Table Digest email, grade/attendance notices, outbox + resend |
| **Principal office** | Tuition, QuickBooks, videos, **cameras** (go2rtc + hls.js), pulse, **Go-live** |
| **Campus cameras** | Principal live wall — EasyCamera LiveGrid pattern + go2rtc/MediaMTX HLS + hls.js simulator fallback |
| **Missing Work Radar** | Calm past-due vs upcoming list (parent + teacher Today) |
| **Teacher Today** | Per-class missing-work focus without district dashboards |
| **Teacher Quick Mode** | Phone-first attendance / scores / pulse |
| **Teacher printables** | Birthday Coupon Book (4th/5th) — printable classroom freebies |
| **Go-live / onboarding** | Health probes, checklist, first-run setup % |
| **Badges & kiosk** | Room attendance, aftercare billable rooms, public `/kiosk` + RFID device API |
| **Roster / approvals** | Teacher-owned classes/students; principal delete approvals + version history |
| **Public** | School marketing site at `/school` (driven by school branding / `?school=` slug) |

### Market positioning (why not FACTS / Jupiter / PowerSchool)

| Competitor pattern | Beacon response |
|--------------------|-----------------|
| Portals of tables | Dinner Table Digest + conversation starters |
| Missing work buried | Missing Work Radar (past-due ≠ future-due) |
| District analytics | Beacon Signal + Teacher Today (small-school scale) |
| Slow PTC prep | Conference Brief one-pager |
| Grades only | Beacon Pulse whole-child |
| Teacher desktop-only | Quick Mode phone-first |

## Live

**Production:** https://beacon.commoncentsip.com  
**School site:** https://beacon.commoncentsip.com/school  
**Go-live (principal):** https://beacon.commoncentsip.com/principal/release  
**Health (liveness):** https://beacon.commoncentsip.com/api/health  

Pilot accounts are issued privately. Set school branding in **Principal → Go-live**.

## Local setup

**Node 22** (matches CI) and **npm** via Corepack (`packageManager`: `npm@10.9.2` in `package.json`).

```bash
# Node 22: nvm use / fnm use (repo has .nvmrc)
corepack enable
npm install
cp .env.example .env.local
```

**Required in `.env.local` for a real app session:**

| Variable | Why |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth + client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth + client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server actions / admin client (never expose to browser) |

Then apply **migrations 001–018** (see below) and:

```bash
npm run dev
```

Without migrations, core tables may exist from 001 only; billing, kiosk vault, roster approvals, and RLS lockdown will be missing or degraded.

### Quality automation

```bash
npm run lint
npm run lint:fix      # ESLint --fix only (no separate Prettier/Biome)
npm run typecheck
npm test                 # vitest unit tests
npm run test:coverage    # vitest + coverage thresholds (gated files in vitest.config.ts)
npm run build
npm run ci               # lint + typecheck + test:coverage + build  (no e2e)
```

**GitHub Actions** (`.github/workflows/ci.yml`) on push/PR to `main` does **not** call `npm run ci`. It runs the same quality steps as separate jobs, then **Playwright public smoke**:

```bash
npm run build            # required first for local e2e (webServer uses `next start`)
npm run test:e2e:install # once: Chromium (+ OS deps in CI)
npm run test:e2e         # default: http://127.0.0.1:3010
# Or against a running host:
# PLAYWRIGHT_BASE_URL=https://beacon.commoncentsip.com npm run test:e2e
```

Coverage thresholds apply only to a **whitelist** (roles, safe-redirect, security/*, badge codes/guards, freeform-policy, class-access) — not the entire tree. See `vitest.config.ts`.

### Database migrations

**Source of truth:** `supabase/migrations/` files **001–018** in filename order.

```bash
# Preferred
DATABASE_URL='postgresql://postgres:…@db.<ref>.supabase.co:5432/postgres' npm run db:migrate

# Or password + explicit project ref (never rely on a silent default)
POSTGRES_PASSWORD='…' SUPABASE_PROJECT_REF='your-project-ref' npm run db:migrate

# Apply one prefix only, e.g. 017
POSTGRES_PASSWORD='…' SUPABASE_PROJECT_REF='…' npm run db:migrate -- 017
```

| Range | Why |
|-------|-----|
| **001–005** | Core schema, gradebook RLS, email outbox, principal role |
| **006** | `billing_*` + `quickbooks_connections` tables |
| **007** | attendance, lessons, pulse, videos tables |
| **008–010** | email comms, preferences, pilot feedback |
| **011–012** | badge/kiosk rooms, scans, aftercare, RFID |
| **013–014** | roster revisions + delete approvals; class call number |
| **015** | kiosk token vault (`school_access_tokens`) |
| **016** | RLS lockdown (profile role/school_id, staff write scopes) |
| **017** | billing first-class: product `code`, invoice `source_key`, demo QB status, parent read RLS, one-time migrate legacy JSON → tables |
| **018** | kiosk/device token expiry (`kiosk_token_expires_at` / `device_token_expires_at`; default 90 days) |

**Billing money path** uses tables only. Aftercare invoices are idempotent via `source_key = aftercare_session:<id>`.

**Kiosk / device tokens** expire (fail closed on resolve). TTL default **90 days** (`BEACON_ACCESS_TOKEN_TTL_DAYS`). Opening Principal → Badges regenerates expired halves; tablets/ESP32 must re-open the kiosk link or update the device token.

#### Operator notes (avoid footguns)

| Path | Use it for |
|------|------------|
| `npm run db:migrate` → `scripts/apply-migrations.mjs` | **Preferred** full apply; tracks `beacon_schema_migrations` |
| Supabase SQL Editor + files under `supabase/migrations/` | Manual apply in order |
| `scripts/pending-*.sql` | Optional **paste copies** for the SQL Editor — prefer canonical migrations; some bundles are partial |
| `scripts/run-migration.mjs` | **Legacy: only 001** — do not use for full upgrades |
| `scripts/apply-migration-007.mjs` | **Legacy: only 007** — use `db:migrate` instead |

Password-only apply **requires** `SUPABASE_PROJECT_REF` (scripts exit with an error if it is missing). Prefer `DATABASE_URL` so the target is unambiguous.

### Branding any school

1. Sign in as principal/admin  
2. Open **Principal → Go-live**  
3. Save school name, short name, mission, website, contact  
4. Public `/school`, login, headers, and emails use that brand  

Optional: `BEACON_PRINCIPAL_EMAIL=you@yourschool.org` elevates that user when their profile role is already **admin, staff, or principal** (not parent/teacher). Alias: `BEACON_DEMO_PRINCIPAL_EMAIL`.

### Email & QuickBooks

| Mode | Behavior |
|------|----------|
| No Resend **and** no SMTP | Emails **log-only** (outbox `skipped`) — safe dry-run |
| Resend and/or SMTP | Cascade: Resend → SMTP → log; `EMAIL_FROM` must be a **verified domain** (not `onboarding@resend.dev` in production) |
| School brand email | Used as **Reply-To** so parents can answer the office |
| No Intuit keys | QuickBooks **demo** status only (not “connected”) |
| Intuit OAuth set | Tokens vaulted on `quickbooks_connections` (not returned to clients); Beacon invoices/payments still **local** until QBO write API is built |

**Production email checklist**

1. Verify domain (Resend and/or SMTP)  
2. Vercel → `RESEND_API_KEY` and/or SMTP_* + `EMAIL_FROM=School Name <office@yourdomain.org>`  
3. Optional: `BEACON_HEALTH_SECRET` for readiness probes (`x-beacon-health-secret` header)  
4. Principal → Go-live → school contact email (Reply-To)  
5. **Comms** → delivery test → confirm inbox  

Leadership (and teachers for email) see a trust banner until transports are honest-live. Details on **Go-live**.

### Optional integrations

Full list of names lives in **`.env.example`**. Summary:

| Integration | Env | Purpose |
|-------------|-----|---------|
| Pilot owner email | `BEACON_FEEDBACK_TO` / `BEACON_OWNER_EMAIL` | Suggestion button inbox (**not** the principal) |
| ntfy push | `BEACON_NTFY_*` | Owner phone alerts |
| Twilio SMS | `TWILIO_*` | Aftercare parent SMS |
| Upstash Redis | `UPSTASH_REDIS_REST_*` | **Required on production/preview** for multi-instance rate limits (or `RATE_LIMIT_ALLOW_MEMORY=1` break-glass). Go-live fails without either. |
| Access token TTL | `BEACON_ACCESS_TOKEN_TTL_DAYS` | Kiosk/device secret lifetime (default 90) |
| School day TZ | `BEACON_SCHOOL_TZ` | Badge attendance calendar day (default `America/Chicago`) |
| OAuth state | `BEACON_OAUTH_STATE_SECRET` | QB OAuth HMAC (else falls back to service role key) |
| App URL | `NEXT_PUBLIC_APP_URL` | Absolute links in email |
| Sentry | `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Optional; `@sentry/nextjs` **not** installed by default — `reportError` logs to console and no-ops capture without the package |
| Playwright | `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_PORT` | E2E against custom host/port |

Platform-provided (do not put secrets in git): `VERCEL_URL`, `VERCEL_ENV`, `VERCEL_PROJECT_PRODUCTION_URL`, `NODE_ENV`, `CI`.

## Deploy

1. Secrets live only in **Vercel Production env** (see `.env.example` for names).
2. **Preferred:** push to `main` → Vercel deploys over HTTPS. CI runs typecheck, lint, coverage, build, and Playwright smoke (see above).
3. **Health**
   - **Liveness** (public): `GET /api/health` → `{ "status": "ok", "generatedAt": "…" }` (no DB, no `checks`).
   - **Readiness** (secret header only — not query string):  
     `x-beacon-health-secret: $BEACON_HEALTH_SECRET` →  
     `{ status, generatedAt, checks: { supabaseEnv, database, databaseDetail, emailLive } }`  
     HTTP **200** if env+DB OK, else **503**.
   - **Go-live** (authenticated principal): richer table/integration probes in the UI — separate from `/api/health`.
4. Email: configure verified From + Resend/SMTP, then **Comms → delivery test**.

## Security / trust

- Parents only access students linked in `parent_students`
- Staff scoped by `school_id`
- Principal office requires principal or admin role
- Service role used only after a verified session in app code; edge session refresh is cookie-based in `src/proxy.ts`
- Production/preview without Supabase public env returns **503** on non-public routes (fail closed)
- No hard-coded single-school principal identity
- `.gitignore` blocks `.env*`; only `.env.example` is committed
- There is **no** `AUTH_OPEN` break-glass in this product (that pattern appears only in global Solid Systems text)

## Observability

| Signal | Where |
|--------|--------|
| App liveness | `GET /api/health` |
| App readiness | Same + `x-beacon-health-secret` |
| Go-live probes | Principal → Go-live |
| Email delivery | Comms outbox (`sent` / `failed` / `skipped`) |
| Staff actions | `audit_logs` |
| Error product (Sentry) | Optional / not wired as a dependency; outbox + audit + health cover pilot |

## Complexity & hidden dependencies (maintainers)

| Item | Notes |
|------|--------|
| Dual SQL copies (`migrations/` vs `scripts/pending-*`) | Prefer migrations; pending files can lag if edited alone |
| Suite JSON fallback (007) | Soft-degrades pilots; **billing does not** soft-degrade to settings |
| Cameras in settings JSON | Intentional; no first-class camera table |
| Coverage whitelist | CI can be green while large areas have no threshold gate |
| `npm run ci` ≠ GitHub Actions | Local `ci` skips Playwright |
| go2rtc / MediaMTX | External camera stack — not installed by this repo |
| Legacy migrators (`run-migration.mjs`, `apply-migration-007.mjs`) | Only 001 / only 007; use `npm run db:migrate` |
| `/api/quickbooks/callback` | Not on the public allowlist — user must stay signed in through OAuth |

## Solid Systems checklist (Beacon)

| Item | Status |
|------|--------|
| README (purpose, stack, setup, architecture, deploy) | Yes |
| `.env.example`, no committed secrets | Yes |
| `.gitignore` | Yes |
| Linter + fix (`eslint` / `lint:fix`) | Yes (ESLint only; no Prettier) |
| TypeScript | Yes |
| Core logic tests (vitest) + coverage gate on security surface | Yes |
| GitHub Actions (typecheck, lint, coverage, build, e2e) | Yes |
| Dependabot (npm + actions) | Yes (`.github/dependabot.yml`) |
| packageManager pin + Corepack in CI | Yes (`npm@10.9.2`) |
| Secrets in platform env only | Yes (Vercel) |
| Error tracking considered | Yes (Sentry optional/deferred; outbox/health now) |
| Deploy from Git | Preferred path on Vercel |
| HTTPS only | Vercel |
| Health check | `/api/health` + Go-live |
| Branch protection + required reviews | Configure in GitHub org settings (not in-repo) |

## Repo

https://github.com/chadbergndsu/beacon
