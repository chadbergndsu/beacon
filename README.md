# Beacon

**The full school suite for any school** — academics, family communications, principal operations, and payments.

Multi-tenant by design: each `schools` row carries its own name, branding, roster, and settings. JupiterEd familiarity where it helps teachers, cleaner than Blackbaud where families need clarity.

This repo follows **[Solid Systems Standards](https://github.com/chadbergndsu/solid-systems-standards)** — see `AGENTS.md`.

## Stack

| Layer | Choice | Notes |
|-------|--------|--------|
| App | Next.js App Router + TypeScript + Tailwind | Portable web frontend |
| DB | Supabase Postgres | Schema owned in `supabase/migrations/` |
| Auth | Supabase Auth | Session checked before service-role use |
| Host | Vercel + HTTPS | Default per Solid Systems |
| Email | Resend and/or SMTP (cascade) | Log-only outbox without live transport; never use `onboarding@resend.dev` in prod |
| Billing | QuickBooks OAuth (optional) | Demo/metadata only until live Intuit posting is built |

## Architecture (short)

- **Multi-tenant:** `schools` + `school_id` on roster/grades; brand in `schools.settings.brand`
- **Academics:** core tables (`classes`, `assignments`, `grades`, …)
- **Suite modules:** prefer tables from migration `007`; JSON fallback only if tables missing
- **Communications:** `email_outbox` + Resend→SMTP→log cascade; every attempt recorded
- **Ops:** principal Go-live UI + `GET /api/health` (liveness) / secret header for readiness

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
**Health:** https://beacon.commoncentsip.com/api/health  

Pilot accounts are issued privately. Set school branding in **Principal → Go-live**.

## Local setup

```bash
npm install
cp .env.example .env.local
# Fill Supabase URL + keys (never commit real secrets)
npm run dev
```

### Quality automation

```bash
npm run lint
npm run lint:fix   # ESLint auto-fix (formatter gate)
npm run typecheck
npm test
npm run build
npm run ci          # lint + typecheck + test + build
```

GitHub Actions runs `npm run ci` on push/PR to `main` (see `.github/workflows/ci.yml`).

### Database migrations

Apply SQL in `supabase/migrations/` **in order** (Supabase SQL Editor), or:

```bash
DATABASE_URL='postgresql://…' node scripts/apply-migrations.mjs
# or
POSTGRES_PASSWORD='…' node scripts/apply-migrations.mjs
```

**Pilot requirement:** apply **`001`–`016`** in order (or `scripts/pending-011-to-015-all.sql` then `pending-016-security-rls-lockdown.sql` for late badge/security pieces).

| Range | Why |
|-------|-----|
| **007** | attendance, lessons, pulse, videos tables |
| **011–012** | badge/kiosk rooms, scans, aftercare, RFID |
| **013** | roster revisions + delete approvals |
| **015** | kiosk token vault (`school_access_tokens`) |
| **016** | RLS lockdown (profile role/school_id, staff write scopes) |

The app **prefers first-class tables**. JSON in `schools.settings` is only a fallback if a table is missing.

### Branding any school

1. Sign in as principal/admin  
2. Open **Principal → Go-live**  
3. Save school name, short name, mission, website, contact  
4. Public `/school`, login, headers, and emails use that brand  

Optional: `BEACON_PRINCIPAL_EMAIL=you@yourschool.org` elevates that user to principal when needed for seed accounts.

### Email & QuickBooks

| Mode | Behavior |
|------|----------|
| No Resend **and** no SMTP | Emails **log-only** (outbox `skipped`) — safe dry-run |
| Resend and/or SMTP | Cascade: Resend → SMTP → log; `EMAIL_FROM` must be a **verified domain** (not `onboarding@resend.dev` in production) |
| School brand email | Used as **Reply-To** so parents can answer the office |
| No Intuit keys | QuickBooks **demo** status only (not “connected”) |
| Intuit OAuth set | Tokens vaulted server-side; Beacon billing still **local** until QBO write API is built |

**Production email checklist**

1. Verify domain (Resend and/or SMTP)  
2. Vercel → `RESEND_API_KEY` and/or SMTP_* + `EMAIL_FROM=School Name <office@yourdomain.org>`  
3. Optional: `BEACON_HEALTH_SECRET` for readiness probes (`x-beacon-health-secret` header)  
4. Principal → Go-live → school contact email (Reply-To)  
5. **Comms** → delivery test → confirm inbox  

Leadership (and teachers for email) see a trust banner until transports are honest-live. Details on **Go-live**.

## Deploy

1. Secrets live only in **Vercel Production env** (see `.env.example` for names).
2. **Preferred:** push to `main` → Vercel deploys over HTTPS (CI also runs Playwright e2e).
3. Liveness: `GET /api/health` → bare `{ "status": "ok" }` (no DB check).  
   Readiness: same path with header `x-beacon-health-secret: $BEACON_HEALTH_SECRET` (checks env + DB + honest email).
4. Email: configure verified From + Resend/SMTP, then **Comms → delivery test**.

## Security / trust

- Parents only access students linked in `parent_students`
- Staff scoped by `school_id`
- Principal office requires principal or admin role
- Service role used only after `getUser()` session check
- No hard-coded single-school principal identity
- `.gitignore` blocks `.env*`; only `.env.example` is committed

## Observability

| Signal | Where |
|--------|--------|
| App health | `GET /api/health` |
| Go-live probes | Principal → Go-live |
| Email delivery | Comms outbox (`sent` / `failed` / `skipped`) |
| Staff actions | `audit_logs` |
| Error product (Sentry) | Considered for later; outbox + audit + health cover pilot |

## Solid Systems checklist (Beacon)

| Item | Status |
|------|--------|
| README (purpose, stack, setup, architecture, deploy) | Yes |
| `.env.example`, no committed secrets | Yes |
| `.gitignore` | Yes |
| Linter + fix (`eslint` / `lint:fix`) | Yes |
| TypeScript | Yes |
| Core logic tests (vitest) | Yes |
| Secrets in platform env only | Yes (Vercel) |
| Error tracking considered | Yes (Sentry deferred; outbox/health now) |
| Deploy from Git | Preferred path on Vercel |
| HTTPS only | Vercel |
| Health check | `/api/health` + Go-live |

## Repo

https://github.com/chadbergndsu/beacon
