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
| Email | Resend (optional) | Log-only outbox without `RESEND_API_KEY` |
| Billing | QuickBooks OAuth (optional) | Demo mode without Intuit keys |

## Architecture (short)

- **Multi-tenant:** `schools` + `school_id` on roster/grades; brand in `schools.settings.brand`
- **Academics:** core tables (`classes`, `assignments`, `grades`, …)
- **Suite modules:** prefer tables from migration `007`; JSON fallback only if tables missing
- **Communications:** `email_outbox` + Resend; never silent — every attempt is recorded
- **Ops:** principal Go-live UI + public `GET /api/health`

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
| **Public** | School marketing site at `/school` (driven by school branding) |

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

**Pilot requirement:** migration `007` creates real tables for `attendance`, `lesson_plans`, `pulse_entries`, and `school_videos`. The app **writes to those tables first**. JSON in `schools.settings` is only a fallback if a table is missing (migration not applied yet).

### Branding any school

1. Sign in as principal/admin  
2. Open **Principal → Go-live**  
3. Save school name, short name, mission, website, contact  
4. Public `/school`, login, headers, and emails use that brand  

Optional: `BEACON_PRINCIPAL_EMAIL=you@yourschool.org` elevates that user to principal when needed for seed accounts.

### Email & QuickBooks

| Mode | Behavior |
|------|----------|
| No `RESEND_API_KEY` | Emails **log-only** (outbox status `skipped`) — safe for dry-run |
| Resend configured | Live delivery; verify domain in Resend; `EMAIL_FROM` must match that domain |
| School brand email | Used as **Reply-To** so parents can answer the office (not a dead noreply) |
| No Intuit keys | QuickBooks **Connect** activates a **labeled sandbox demo** only |
| Intuit OAuth set | Live sandbox/production per `INTUIT_ENVIRONMENT` |

**Production email checklist**

1. [resend.com](https://resend.com) → Domains → add school domain → DNS verify  
2. Vercel → `RESEND_API_KEY` + `EMAIL_FROM=School Name <office@yourdomain.org>` (Production)  
3. Principal → Go-live → set school contact email (Reply-To)  
4. **Comms** → Send delivery test → confirm inbox  
5. Compose / Announcements / Dinner Table Digest email as needed  

Leadership sees a trust banner until email + QB are production-ready. Details on **Go-live**.

## Deploy

1. Secrets live only in **Vercel Production env** (see `.env.example` for names).
2. **Preferred:** push to `main` → Vercel deploys over HTTPS.
3. Confirm `GET /api/health` returns `"status":"ok"`.
4. Email: set Resend keys, then **Comms → Send live test**.

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
