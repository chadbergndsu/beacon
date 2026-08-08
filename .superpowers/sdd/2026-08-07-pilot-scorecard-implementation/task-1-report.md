# Task 1 Report: Privacy-Minimized Database Contract

## Status

Implemented and locally verified the pilot scorecard database foundation. The change is limited to one CLI-generated migration and one pgTAP contract; no application TypeScript or later plan-task files were changed.

## Implementation

- Added `public.pilot_activity_daily` as a privacy-minimized, daily-deduplicated activity ledger.
  - Stores only `school_id`, `user_id`, an allowlisted `actor_role`, an allowlisted `event_type`, `activity_date`, and `created_at`.
  - Cannot store student IDs, URLs, IP/IP-address fields, user agents, notes, or payloads.
  - Has RLS enabled and intentionally has no client policies.
  - Revokes all effective table access from `PUBLIC`, `anon`, and `authenticated`.
  - Explicitly revokes legacy/default `service_role` table privileges before granting only `SELECT` and `INSERT`. This extra revoke was required because the local project ACL otherwise retained privileges such as `REFERENCES`.
- Added `public.parent_experience_feedback` as a tightly scoped weekly response table.
  - Accepts only `helpful` or `not_yet`, only the `parent_dashboard` surface, and comments no longer than 500 characters.
  - Enforces one response per school, parent, surface, and week.
  - Grants authenticated clients only `SELECT`, `INSERT`, and `UPDATE`; grants the service role only `SELECT`; grants anonymous clients nothing.
  - Parent policies require `auth.uid()` ownership, the profile's school, the `parent` role, and the current UTC ISO week for select/insert/update, with both `USING` and `WITH CHECK` on updates.
  - Leadership select permits only same-school `admin` and `principal`; `teacher` and `staff` roles see no rows.
- Added 37 pgTAP assertions with fixtures for two schools, two local parents, a second-school parent, a teacher, a principal, an office admin (`admin`), and office staff (`staff`).

## Files

- `supabase/migrations/20260807185007_pilot_scorecard_activity.sql`
  - Created by `npx supabase migration new pilot_scorecard_activity`; the CLI-generated timestamp was not invented or renamed.
- `supabase/tests/pilot_scorecard.test.sql`
  - Structural, privilege, RLS, tenant-isolation, weekly-boundary, uniqueness, and constraint coverage.
- `.superpowers/sdd/2026-08-07-pilot-scorecard-implementation/task-1-report.md`
  - This report.

## Current Supabase Guidance Consulted

- Fetched `https://supabase.com/changelog.md` on 2026-08-07 and scanned current breaking changes. The relevant 2026-04-28 Data API change makes new-table exposure opt-in, reinforcing the need for explicit grants. No newer RLS/Data API breaking change altered this contract.
- Consulted the current official Row Level Security documentation. It confirms explicit `TO authenticated`, ownership predicates using `(SELECT auth.uid())`, `WITH CHECK` for inserts, and both `USING` and `WITH CHECK` for safe updates; updates also require a matching SELECT policy.
- Consulted the current official Data API security documentation. It confirms that table grants control object reachability separately from RLS row filtering, and recommends least-privilege explicit grants in the same migration as RLS.
- Consulted the current official database/pgTAP testing documentation and followed the repository's transaction, fixture, role-switching, and JWT-claim conventions.

## RED Evidence

The initial bare `supabase` command was unavailable in the shell, so the project-local CLI was used through `npx`. The first `npx` attempt correctly reported that the local Postgres container was not running; this was environment setup, not counted as RED evidence.

After `npx supabase start`, the required pre-implementation run was:

```text
$ npx supabase test db supabase/tests/pilot_scorecard.test.sql --local
Connecting to local database...
ERROR: relation "public.pilot_activity_daily" does not exist
Failed test 1: "the daily pilot activity ledger exists"
Failed test 2: "the weekly parent feedback table exists"
Result: FAIL
```

This failure was caused by the missing pilot schema, as required.

The first post-migration run also provided useful test-first feedback:

```text
Failed test 8: "the service role has only SELECT and INSERT on the daily ledger"
have: (REFERENCES)
want: (SELECT)
Failed test 12: "the service role has read-only access to parent feedback"
have: (REFERENCES)
want: (SELECT)
```

That exposed legacy/default service-role ACLs. The migration was minimally corrected by revoking all service-role table privileges before adding the prescribed grants. The test plan metadata was also corrected from 38 to the actual 37 assertions.

## GREEN Evidence

Focused pgTAP contract after a clean local database reset:

```text
$ npx supabase test db supabase/tests/pilot_scorecard.test.sql --local
.../supabase/tests/pilot_scorecard.test.sql .. ok
All tests successful.
Files=1, Tests=37
Result: PASS
```

Full database regression suite:

```text
$ npx supabase test db supabase/tests --local
authorization_boundaries.test.sql .... ok
pilot_scorecard.test.sql ............. ok
public_inquiry_rate_limits.test.sql .. ok
All tests successful.
Files=3, Tests=79
Result: PASS
```

Application regression checks:

```text
$ npm run typecheck
exit 0

$ npm test
Test Files  74 passed (74)
Tests       304 passed (304)
exit 0

$ npm run lint
exit 0
```

The first lint run while the Supabase stack was active inspected generated code under `supabase/.temp/start-secrets` and failed there. After stopping the local stack normally, the unmodified repository lint command passed. No generated file was edited or committed.

## Other Commands and Output

```text
$ npx supabase --version
2.111.0

$ npx supabase migration new pilot_scorecard_activity
Migration created: supabase/migrations/20260807185007_pilot_scorecard_activity.sql

$ npx supabase db reset --local
Applied migration 20260807185007_pilot_scorecard_activity.sql
Reset local database.

$ npx supabase migration list --local
... local 20260807185007 / applied 20260807185007
exit 0

$ npx supabase db lint --local --schema public --level warning --fail-on error
No schema errors found
exit 0

$ npx supabase db advisors --local --type security --level info --fail-on error
No error-level findings
exit 0

$ git diff --check
exit 0
```

The local Supabase stack was stopped normally after verification, retaining its local volume.

## Self-Review

- Scope: only the requested migration, pgTAP contract, and report were added. No application code was changed.
- Privacy: reviewed the ledger column list directly and added a catalog assertion that forbidden identifiers/context fields are absent.
- Object privileges: tests enumerate all standard table privileges and assert the exact effective privilege sets for `anon`, `authenticated`, and `service_role` on both tables.
- RLS: both public tables have RLS enabled; the ledger has no client policy; feedback policies target only `authenticated` and combine identity, school, role, and week checks.
- Tenant boundary: tests prove a parent cannot spoof parent/school/week, leadership cannot read another school, and teacher/staff roles see zero feedback.
- Mutation/constraint coverage: removing or widening any allowlist, comment limit, current-week condition, ownership check, school check, role check, uniqueness constraint, grant revoke, or RLS enablement causes at least one pgTAP assertion to fail.
- Time boundary: PostgreSQL `date_trunc('week', timezone('utc', now()))::date` uses Monday week starts and is applied identically in the prescribed select/insert/update policies.
- Secrets: no secrets, keys, or environment values were added to source or the commit. Service-role usage is represented only as a database role grant; no client key handling was introduced.

## Concerns and Deferred Items

- Supabase advisors emit an informational `rls_enabled_no_policy` item for `pilot_activity_daily`. This is intentional: the server-only table has RLS as defense in depth, no client policy, no `anon`/`authenticated` privilege, and only the prescribed service-role operations.
- Advisors emit a performance warning for the two permissive authenticated SELECT policies on `parent_experience_feedback`. The separate parent and leadership policies are prescribed by the task and have disjoint role predicates; no security error is present.
- Advisors emit informational unindexed-foreign-key notices for `pilot_activity_daily.user_id` and `parent_experience_feedback.parent_id`. The task prescribes school/window indexes and does not define user/parent lookup workloads; adding extra indexes was deferred to avoid expanding the contract. Cascading profile deletes could merit dedicated indexes if production volume demonstrates a need.
- The CLI reported v2.112.0 is available while the repository pins and executed v2.111.0. No command used by this task was blocked or deprecated in the installed version.
