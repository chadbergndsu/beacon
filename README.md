# Beacon

**The full school suite for any school** — academics, family communications, principal operations, and payments.

Multi-tenant by design: each `schools` row carries its own name, branding, roster, and settings. JupiterEd familiarity where it helps teachers, cleaner than Blackbaud where families need clarity.

This repo follows **[Solid Systems Standards](https://github.com/chadbergndsu/solid-systems-standards)** — see `AGENTS.md` (global standards template). **Beacon-specific setup and truth live in this README** and `.env.example`.

## Stack

| Layer | Choice | Notes |
|-------|--------|--------|
| App | Next.js 16 App Router + React 19 + TypeScript + Tailwind 4 | Portable web frontend |
| Auth edge | `src/proxy.ts` → Supabase SSR session | Public routes listed below; fail-closed without Supabase env on prod/preview |
| DB | Supabase Postgres | Schema owned in `supabase/migrations/` (**001–023**) |
| Auth | Supabase Auth | App code uses `getUser()` before service-role; edge refreshes cookies via `getClaims()` |
| Host | Vercel + HTTPS | Default per Solid Systems |
| Email | Resend and/or SMTP (cascade) | Log-only outbox without live transport; never use `onboarding@resend.dev` in prod |
| Billing | QuickBooks OAuth (optional) | Tokens on `quickbooks_connections`; **Push to QuickBooks** posts customers/invoices/payments via Accounting API when connected |
| Cameras | hls.js + go2rtc/MediaMTX URLs | Stored in `schools.settings` modules JSON (no dedicated camera table) |
| SMS | Twilio (optional) | Aftercare parent notify |
| Rate limits | In-memory; Upstash optional | Kiosk / device / login |

## Architecture (short)

- **Multi-tenant:** `schools` + `school_id` on roster/grades; brand in `schools.settings.brand`
- **Academics:** core tables (`classes`, `assignments`, `grades`, …)
- **Suite modules (007):** prefer tables for attendance, lessons, pulse, videos; **JSON fallback** only if those tables are missing. **Cameras always stay in settings JSON.**
- **Billing (006 + 017):** `billing_products` / `billing_invoices` / `billing_payments` / `quickbooks_connections` only — **no** `schools.settings.billing` money path
- **Communications:** `email_outbox` + `email_inbox` (parent replies) + Resend→SMTP→log cascade; every send and reply recorded
- **Ops:** Principal Go-live UI (`probeOpsHealth`) + public `GET /api/health` (see Health below)

### Public (unauthenticated) routes

Exact allowlist in `src/lib/supabase/proxy.ts`: `/`, `/login`, `/about`, `/school`, `/vs/facts`, `/vs/renweb`, `/privacy`, `/terms`, `/kiosk`, `/kiosk/*`, `/api/kiosk/*`, `/pay/*` (family invoice portal), `/api/stripe/*` (webhook), `/api/email/*` (inbound reply webhook), `/api/health`.

**Product home (`/`):** logged-out visitors see the Beacon marketing landing + school inquiry form. Logged-in users go to `/dashboard`. Tenant school site remains at `/school`.

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
| **BeaconCraft** | Voxel digital twin at `/craft` — multi-floor campus, live badge presence (Realtime + poll), layout editor on Go-live |
| **Communications** | **Family Desk** (`/desk`) — intention-based compose, reply inbox, logged outbox; parents get **Notes from school** (`/messages`) |
| **Principal office** | Tuition, family billing portal, QuickBooks, videos, **cameras**, pulse, **Go-live** |
| **Family billing** | Pay portal `/pay/[token]`, email reminders, payment plans, recurring schedules, optional Stripe + QBO push — **school-owned** (not BillerGenie/third-party biller) |
| **Campus cameras** | Principal live wall — EasyCamera LiveGrid pattern + go2rtc/MediaMTX HLS + hls.js simulator fallback |
| **Missing Work Radar** | Calm past-due vs upcoming list (parent + teacher Today) |
| **Teacher Today** | Per-class missing-work focus without district dashboards |
| **Teacher Quick Mode** | Phone-first attendance / scores / pulse |
| **Teacher printables** | Birthday Coupon Book (4th/5th) — printable classroom freebies |
| **Go-live / onboarding** | Health probes, checklist, first-run setup % |
| **Badges & kiosk** | Room attendance, aftercare billable rooms, public `/kiosk` + RFID device API; kiosk **welcome screen** on scan |
| **Campus twin (BeaconCraft)** | 3D property; badge scans place kids **in the room** on the twin (ADR `docs/adr/001-campus-twin-scan-presence.md`) |
| **Roster / approvals** | Teacher-owned classes/students; principal delete approvals + version history |
| **Public** | School marketing site at `/school` (driven by school branding / `?school=` slug) |

### Market positioning (why not FACTS / Jupiter / PowerSchool)

**Primary fight: FACTS** — they own tuition scale (~15k+ schools claimed). FACTS is **Nelnet (NYSE: NNI)**, not a Christian ministry — it sells into faith schools. Beacon attacks family communications and portal fatigue, not aid/collections depth. Honest compare: [`/vs/facts`](https://beacon.commoncentsip.com/vs/facts) · RenWeb SEO: [`/vs/renweb`](https://beacon.commoncentsip.com/vs/renweb).

| Competitor pattern | Beacon response |
|--------------------|-----------------|
| FACTS Family App + two portals | Family Desk + Notes from school + logged email replies |
| Message delivery black hole | Comms outbox/inbox with live vs log-only honesty |
| Portals of tables | Dinner Table Digest + conversation starters |
| Missing work buried | Missing Work Radar (past-due ≠ future-due) |
| District analytics | Beacon Signal + Teacher Today (small-school scale) |
| Slow PTC prep | Conference Brief one-pager |
| Grades only | Beacon Pulse whole-child |
| Teacher desktop-only | Quick Mode phone-first |
| Third-party tuition lock-in | School-owned invoices + optional Stripe / QuickBooks |

## Live

**Production:** https://beacon.commoncentsip.com  
**Beacon vs FACTS:** https://beacon.commoncentsip.com/vs/facts  
**RenWeb alternative:** https://beacon.commoncentsip.com/vs/renweb  
**School site:** https://beacon.commoncentsip.com/school  
**Campus twin:** https://beaconcraft.vercel.app · tour `/?tour=1`  
**Go-live (principal):** https://beacon.commoncentsip.com/principal/release  
**Health (liveness):** https://beacon.commoncentsip.com/api/health  

Twin bridge plan: `docs/adr/001-campus-twin-scan-presence.md` (scan → kiosk welcome → live markers in rooms).

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

Then apply **migrations 001–023** (see below) and:

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

**Source of truth:** `supabase/migrations/` files **001–023** in filename order.

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
| **019** | family billing: portal tokens, payment plans, recurring schedules |
| **020** | Stripe payment columns (`stripe_checkout_session_id`, payment intent) |
| **021** | P0 money settle: one succeeded payment per invoice |
| **022** | BeaconCraft Realtime: `badge_scans` on `supabase_realtime` publication |
| **023** | Family email inbox: `email_inbox` + `email_outbox.reply_token` for parent reply capture |

**Billing money path** uses tables only. Aftercare invoices are idempotent via `source_key = aftercare_session:<id>`.

**Family email replies:** when `EMAIL_INBOUND_DOMAIN` + webhook secret are set, outbound mail uses `Reply-To: reply+{token}@inbound-domain`. Resend (or Beacon HMAC) posts to `/api/email/inbound`; replies land in Comms → Inbox and on the parent **Messages** page (`/messages`).

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
| School brand email | Office contact (footer + `meta.office_reply_to`). When inbound capture is **off**, also used as **Reply-To**. |
| Inbound capture on | `Reply-To: reply+{token}@EMAIL_INBOUND_DOMAIN` → `/api/email/inbound` logs parent replies in `email_inbox` |
| No Intuit keys | QuickBooks **demo** status only (not “connected”) |
| Intuit OAuth set | Tokens vaulted on `quickbooks_connections`; **Push to QuickBooks** (and auto-push on create when sync prefs on) writes customers/invoices/payments via QBO API. Local rows stay canonical if push fails. |

**Production email checklist**

1. Verify domain (Resend and/or SMTP)  
2. Vercel → `RESEND_API_KEY` and/or SMTP_* + `EMAIL_FROM=School Name <office@yourdomain.org>`  
3. Optional: `BEACON_HEALTH_SECRET` for readiness probes (`x-beacon-health-secret` header)  
4. Principal → Go-live → school contact email (office Reply-To / footer)  
5. **Comms** → delivery test → confirm inbox  
6. **Parent reply logging:** apply migration **023**; set `EMAIL_INBOUND_DOMAIN` + `EMAIL_INBOUND_WEBHOOK_SECRET` (or `RESEND_WEBHOOK_SECRET`); Resend webhook `email.received` → `https://<host>/api/email/inbound`  

Leadership (and teachers for email) see a trust banner until transports are honest-live. Details on **Go-live**.

### Stripe family card pay

School-owned Checkout (not a third-party biller):

1. Create a Stripe account → **Developers → API keys** → copy **Secret key** (`sk_test_…` first).  
2. Vercel env: `STRIPE_SECRET_KEY`, and for production webhooks `STRIPE_WEBHOOK_SECRET`.  
3. **Developers → Webhooks → Add endpoint**  
   - URL: `https://<your-domain>/api/stripe/webhook`  
   - Event: `checkout.session.completed`  
4. Apply migration **020** (`npm run db:migrate`).  
5. Principal → Family billing → create invoice → **Email pay link** → parent opens `/pay/…` → **Pay with card**.  

Local webhook forward:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# paste whsec_… into .env.local as STRIPE_WEBHOOK_SECRET
```

Success URL also reconcilies via `session_id` if the webhook is delayed.

**Single-school treasury:** one `STRIPE_SECRET_KEY` is for **one** school’s money. If more than one `schools` row exists, Checkout is blocked unless you set `BEACON_STRIPE_MULTI_SCHOOL=1` (explicit break-glass — prefer Stripe Connect later). Apply migration **021** for one-succeeded-payment-per-invoice.

### Recurring billing cron

Vercel Cron hits `GET /api/cron/billing-schedules` daily (`vercel.json`, 13:00 UTC) and creates open invoices for due schedules.

1. Set `CRON_SECRET` in Vercel (Production + Preview).  
2. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically for cron invokes.  
3. Manual test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://beacon.commoncentsip.com/api/cron/billing-schedules
```

Aftercare billing emails family pay links automatically when sessions are billed.

### Optional integrations

Full list of names lives in **`.env.example`**. Summary:

| Integration | Env | Purpose |
|-------------|-----|---------|
| Pilot / inquiry owner email | `BEACON_FEEDBACK_TO` / `BEACON_OWNER_EMAIL` | About + landing school inquiries **and** Suggestion button → product owner (**not** the principal). Defaults to `office@commoncentsip.com` if unset. |
| ntfy push | `BEACON_NTFY_*` | Owner phone alerts |
| Twilio SMS | `TWILIO_*` | Aftercare parent SMS |
| Stripe (family pay) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Card Checkout on `/pay/[token]`; webhook `/api/stripe/webhook`; success-page confirm; migration **020** |
| Cron | `CRON_SECRET` | Daily recurring tuition (`/api/cron/billing-schedules`) |
| Upstash Redis | `UPSTASH_REDIS_REST_*` | **Required on production/preview** for multi-instance rate limits (or `RATE_LIMIT_ALLOW_MEMORY=1` break-glass). Go-live fails without either. |
| Access token TTL | `BEACON_ACCESS_TOKEN_TTL_DAYS` | Kiosk/device secret lifetime (default 90) |
| School day TZ | `BEACON_SCHOOL_TZ` | Badge attendance calendar day (default `America/Chicago`) |
| OAuth state | `BEACON_OAUTH_STATE_SECRET` | QB OAuth HMAC (else falls back to service role key) |
| App URL | `NEXT_PUBLIC_APP_URL` | Absolute links in email |
| Sentry | `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Optional; package installed. Init only when DSN set. Server + browser + `global-error` + `reportError` on email/SMS/aftercare failures |
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
| Error product (Sentry) | `@sentry/nextjs` + `instrumentation.ts`; enable with `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` |

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
| Error tracking considered | Yes (`@sentry/nextjs` optional via DSN; outbox/health always) |
| Deploy from Git | Preferred path on Vercel |
| HTTPS only | Vercel |
| Health check | `/api/health` + Go-live |
| Branch protection + required reviews | Configure in GitHub org settings (not in-repo) |

## BeaconCraft (digital twin)

**Route:** `/craft` (staff/principal nav link **Craft**)

Minecraft-style voxel campus driven by badge presence. Not the same product as **Beacon Signal** (climate analytics).

| Piece | Location |
|-------|----------|
| Campus layout (multi-floor v2) | `src/lib/craft/layout.ts`, `campus.ts` |
| Role-filtered presence | `src/lib/craft/presence.ts` |
| Realtime + fallback poll | `src/lib/craft/realtime-client.ts` · migration **022** |
| Poll presence API | `GET /api/craft/presence` |
| Mock door scan (admin) | `POST /api/craft/mock-scan` `{ studentId, roomId, studentName?, timestamp? }` |
| Layout editor (Go-live) | `CraftLayoutEditor` on Principal → Go-live — drag rooms, floor tabs, JSON/SVG import |
| Real badge path | Merges `listRoomPresence()` when layout room **names** match `school_rooms` |

**Controls:** click world for pointer lock · WASD move · sprint · floor switcher + stairs/elevator portals · admin fly (Space up / Shift down) · room search teleports · rotating mini-map + compass · mobile move/look pads.

**Privacy defaults:** teachers see their classroom rooms only; parents see linked children by name and optional anonymized “Guest” markers elsewhere; leadership sees full campus.

**Extend:** edit layout on Go-live or import JSON/SVG (`src/lib/craft/svg-import.ts`); custom layout stored in `schools.settings.craft.customLayout`. Wire hardware scans via existing `POST /api/kiosk/device-scan` — presence API merges DB scans when room names align.

**Go-live:** Principal → **Go-live** → layout editor (optional) → **Sync twin rooms** (creates `school_rooms` matching layout names) → smoke-test `/craft` → **Mark smoke test** (checklist item `craft_smoke`). Onboarding and automated health show mapping progress.

**Visuals:** instanced voxel geometry (walls, ceilings, windows, doors), per-room lighting, bloom + N8AO post-processing, fog + contact shadows, wall collision, capsule presence avatars. Two-floor demo with portal transitions.

## Mobile & app stores

Beacon is installable as a **PWA** and prepared for **App Store / Google Play** via thin Capacitor shells that load production HTTPS (same codebase — no native rewrite).

```bash
npm run icons:generate   # regenerate public/icons + app icons
npm run store:check      # in-repo readiness
```

| Piece | Where |
|-------|--------|
| Manifest | `src/app/manifest.ts` → `/manifest.webmanifest` |
| Icons / Play feature | `public/icons/` |
| Privacy / Terms / vs FACTS | `/privacy`, `/terms`, `/vs/facts` (public) |
| Capacitor config | `capacitor.config.cjs` |
| Runbook | `docs/store-launch.md` · ADR `docs/adr/002-store-shells-capacitor.md` |

Store developer accounts, signing, and screenshots are external — see the runbook.

## Repo

https://github.com/chadbergndsu/beacon
