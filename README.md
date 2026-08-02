# Beacon

**The full school suite for any school** — academics, family communications, principal operations, and payments.

Multi-tenant by design: each `schools` row carries its own name, branding, roster, and settings. JupiterEd familiarity where it helps teachers, cleaner than Blackbaud where families need clarity.

## Modules

| Area | What it does |
|------|----------------|
| **Academics** | Grade entry, lesson plans, transparent parent views, CSV export, report cards |
| **Attendance** | Daily roster with optional parent absent/tardy email |
| **Beacon Pulse** | Whole-child check-ins (unique to Beacon) |
| **Dinner Table Digest** | 60-second plain-English parent story + conversation starters (unique) |
| **Conference Brief** | One-page PTC sheet from grades + pulse + attendance (unique) |
| **Beacon Signal** | Principal school climate heart-rate + pastoral watch list (unique) |
| **Families** | Announcements, parent feed, system email |
| **Principal office** | Tuition, QuickBooks, videos, pulse board, **Go-live** ops |
| **Missing Work Radar** | Calm past-due vs upcoming list (parent + teacher Today) |
| **Teacher Today** | Per-class missing-work focus without district dashboards |
| **Teacher Quick Mode** | Phone-first attendance / scores / pulse |
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

**Production:** https://beacon-beta-lemon.vercel.app  
**School site:** https://beacon-beta-lemon.vercel.app/school  
**Go-live (principal):** https://beacon-beta-lemon.vercel.app/principal/release  

Pilot accounts are issued privately. Set school branding in **Principal → Go-live**.

## Local setup

```bash
npm install
cp .env.example .env.local
# Fill Supabase URL + keys
npm run dev
```

### Quality automation

```bash
npm test
npm run lint
npm run build
npm run ci        # lint + test + build
```

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
| Resend configured | Live delivery; verify domain in Resend |
| No Intuit keys | QuickBooks **Connect** activates a **labeled sandbox demo** only |
| Intuit OAuth set | Live sandbox/production per `INTUIT_ENVIRONMENT` |

Leadership sees a trust banner until email + QB are production-ready. Details on **Go-live**.

## Security / trust

- Parents only access students linked in `parent_students`
- Staff scoped by `school_id`
- Principal office requires principal or admin role
- Service role used only after `getUser()` session check
- No hard-coded single-school principal identity

## Repo

https://github.com/chadbergndsu/beacon
