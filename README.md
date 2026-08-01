# Beacon

**The full school suite for Lighthouse Christian Academy** — academics, family communications, principal operations, and payments.

Modern JupiterEd familiarity where it helps teachers, cleaner than Blackbaud where it matters, and transparent grades parents can actually understand. Built under the direction of Chris Cowan.

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
| **Principal office** | Tuition, QuickBooks, videos, pulse board |
| **Teacher Quick Mode** | Phone-first attendance / scores / pulse |
| **Public** | Modern LCA school site at `/school` |

## Live

**Production:** https://beacon-beta-lemon.vercel.app  
**School site:** https://beacon-beta-lemon.vercel.app/school  
**Official LCA site:** https://lcadawsonville.com  

Demo accounts are issued privately (not listed in this public README). Contact the Beacon operator for principal / teacher / parent demo credentials.

## Local setup

```bash
npm install
cp .env.example .env.local
# Fill Supabase URL + keys
npm run dev
```

### Quality automation

```bash
npm test          # unit tests (grade engine, roles, redirects, report cards)
npm run lint
npm run build
npm run ci        # lint + test + build
```

GitHub Actions runs `lint`, `test`, and `build` on every push to `main`.

### Database

Apply SQL migrations in `supabase/migrations/` **in order** via the Supabase SQL Editor.

Optional CLI (requires DB password):

```bash
POSTGRES_PASSWORD='…' node scripts/apply-migration-007.mjs
```

Migration `007_suite_hardening.sql` adds attendance, lesson_plans, pulse_entries, and school_videos tables with non-recursive RLS helpers. App stores **fall back to `schools.settings` JSON** if tables are not applied yet.

### QuickBooks / email (optional)

See `.env.example` for `INTUIT_*` and `RESEND_*` variables.

## Repo

https://github.com/chadbergndsu/beacon
