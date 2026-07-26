# Beacon

**The full school suite for Lighthouse Christian Academy** — academics, family communications, principal operations, and payments.

Modern JupiterEd familiarity where it helps teachers, cleaner than Blackbaud where it matters, and transparent grades parents can actually understand. Built under the direction of Chris Cowan; profits help fund LBC teacher salaries, student tuition, and well-earned rest.

## Modules

| Area | What it does |
|------|----------------|
| **Academics** | Class grade entry, categories, transparent parent grade views, CSV export |
| **Families** | Announcements, parent portal, system email notices |
| **Principal office** | School ops overview, tuition products, invoices, QuickBooks |
| **Coffee break** | Principal-only Tetris (because leadership is hard) |

## Stack

- Next.js (App Router) + TypeScript + Tailwind  
- Supabase (Auth, Postgres)  
- Optional: Resend (email), Intuit QuickBooks Online (payments)

## Live demo

**Production:** https://beacon-beta-lemon.vercel.app

| Role | Email | Password |
|------|--------|----------|
| **Principal (Chris Cowan)** | `principal@lighthouse.test` | `BeaconPrincipal2026!` |
| Teacher | `teacher@lighthouse.test` | `BeaconDemo2026!` |
| Parent | `parent@lighthouse.test` | `BeaconDemo2026!` |

Principal shortcut: https://beacon-beta-lemon.vercel.app/login?as=principal  
Principal office: https://beacon-beta-lemon.vercel.app/principal  
About: https://beacon-beta-lemon.vercel.app/about  

### QuickBooks (principal payments)

```
INTUIT_CLIENT_ID=
INTUIT_CLIENT_SECRET=
INTUIT_REDIRECT_URI=https://beacon-beta-lemon.vercel.app/api/quickbooks/callback
INTUIT_ENVIRONMENT=sandbox
```

Without Intuit keys, Connect QuickBooks activates a sandbox demo company for the full payment tour.

## Local setup

```bash
npm install
cp .env.example .env.local
# Fill Supabase URL + keys
npm run dev
```

Apply SQL migrations in `supabase/migrations/` via the Supabase SQL Editor (in order).

## Repo

https://github.com/chadbergndsu/beacon
