# Beacon

Modern gradebook for **Lighthouse Christian Academy** — JupiterEd-familiar, cleaner and faster, with transparent grade calculations parents can actually understand.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Auth, Postgres, RLS)
- Transparent weighted grade engine (A Beka-style scale)

## Features

- Teacher grade entry grid (spreadsheet-style, keyboard navigation)
- Parent transparent grade view (formula + category breakdown)
- Class setup: categories, assignments, enroll students
- Announcements + system email outbox
- CSV export

## Local setup

```bash
npm install
cp .env.example .env.local
# Fill Supabase URL + keys
npm run dev
```

Apply SQL migrations in `supabase/migrations/` via the Supabase SQL Editor (in order).

## Live demo

**Production:** https://beacon-beta-lemon.vercel.app

Demo logins (shared test accounts):

| Role | Email | Password |
|------|--------|----------|
| **Principal (Chris Cowan)** | `principal@lighthouse.test` | `BeaconPrincipal2026!` |
| Teacher | `teacher@lighthouse.test` | `BeaconDemo2026!` |
| Parent | `parent@lighthouse.test` | `BeaconDemo2026!` |

Principal shortcut: https://beacon-beta-lemon.vercel.app/login?as=principal  
Principal office (after login): https://beacon-beta-lemon.vercel.app/principal  

### QuickBooks (principal payments)

Optional env vars for live Intuit OAuth:

```
INTUIT_CLIENT_ID=
INTUIT_CLIENT_SECRET=
INTUIT_REDIRECT_URI=https://beacon-beta-lemon.vercel.app/api/quickbooks/callback
INTUIT_ENVIRONMENT=sandbox
```

Without these, **Connect QuickBooks** activates a sandbox demo company so the principal can tour invoices and sync UI.

In Supabase → Authentication → URL configuration, set:

- **Site URL:** `https://beacon-beta-lemon.vercel.app`
- **Redirect URLs:** `https://beacon-beta-lemon.vercel.app/**`

## Repo

https://github.com/chadbergndsu/beacon
