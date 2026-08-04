# Database / ops scripts

**Canonical schema:** `../supabase/migrations/` (`001` … `021`).

## Preferred

```bash
# From repo root
DATABASE_URL='postgresql://…' npm run db:migrate
# or
POSTGRES_PASSWORD='…' SUPABASE_PROJECT_REF='your-ref' npm run db:migrate
# one file prefix:
npm run db:migrate -- 017
```

This runs `apply-migrations.mjs`, applies pending files in order, and records them in `beacon_schema_migrations`.

## SQL Editor paste copies (`pending-*.sql`)

These are convenience copies for the Supabase SQL Editor. **If a pending file disagrees with `supabase/migrations/`, the migration file wins.** Prefer re-copying from migrations rather than editing only `pending-*`.

| File | Role |
|------|------|
| `pending-004-to-008.sql` | Bundle (not a substitute for full 001–017 greenfield) |
| `pending-009` … `pending-015` | Per-feature pastes |
| `pending-011-to-015-all.sql` | Late badge/roster/security slice |
| `pending-016-security-rls-lockdown.sql` | RLS lockdown |
| `pending-016-policy-smoke.sql` | **Not a migration** — human assertions after 016 |
| `pending-017-billing-first-class.sql` | Billing first-class (code, source_key, parent RLS, JSON migrate) |
| `pending-018-access-token-expiry.sql` | Kiosk/device token expiry columns + backfill |
| `pending-019-family-billing-portal.sql` | Family portal tokens, payment plans, schedules |
| `pending-020-stripe-payments.sql` | Stripe checkout session / payment intent columns |
| `pending-021-p0-money-settle.sql` | One succeeded payment per invoice |

## Legacy (do not use for full upgrades)

| Script | What it actually does |
|--------|------------------------|
| `run-migration.mjs` | Applies **only** `001_initial_schema.sql` |
| `apply-migration-007.mjs` | Applies **only** `007_suite_hardening.sql` |

Use `npm run db:migrate` instead.
