# Beacon People Messaging — Final Fix Report

Date: 2026-08-07

Starting tree: `ee82757`

Scope: coordinated final fix wave for client attempt locking, durable server idempotency, queue-before-transport bookkeeping, sender-owned outbox/retry, and bounded accessibility findings.

## Status

Implemented on the exact `pilot-scorecard` worktree. No remote database migration, live email, external message, screenshot, or generated media was performed. All database work targeted the local Supabase stack; browser delivery remained deterministic log-only.

## Architecture and upgrade path

The existing `email_outbox` remains the only delivery record. The Supabase CLI-generated additive migration `20260808032938_email_outbox_delivery_integrity.sql` adds:

- nullable `sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL`;
- nullable `attempt_key UUID`;
- `(school_id, sender_id, created_at DESC)` for sender-owned page/stats reads;
- a partial unique index on `(school_id, attempt_key, lower(to_email))` when school and attempt are present;
- a replacement SELECT policy granting leadership school-wide rows and teachers only rows whose `sender_id = auth.uid()` in their verified school.

Both new columns are nullable, so pre-existing system/announcement/digest callers and existing rows continue to work. People and Groups manual compose now set verified sender ownership; People sets a client-generated validated attempt UUID. Retry preserves the original row's sender and uses a new client retry-action UUID. Historical rows with no `sender_id` remain leadership-visible but intentionally do not become teacher-visible because ownership cannot be reconstructed safely.

Delivery now follows one lifecycle:

1. Normalize the recipient email and atomically insert a `queued` outbox claim.
2. On a unique conflict, read and return the prior queued/sent/failed/skipped result without transport.
3. On any other queue failure, fail closed before transport and report only safe school/kind/stage/count context.
4. Call the transport only after the durable claim exists.
5. Finalize the claimed row with transport status, provider, safe private metadata, error, and sent time.
6. If finalization fails after transport, return truthful delivery counts plus a calm bookkeeping note and do not encourage resend.

The old full-row `audit_logs` email fallback was removed from the send path. Sender-scoped reads also fail closed instead of consulting legacy school-wide audit fallback rows.

## TDD RED/GREEN evidence

### Duplicate delivery and durable idempotency

- RED: `send.lifecycle.test.ts` showed transport preceding persistence (`transport`, then `insert:sent`), queue failure still transporting, duplicate `23505` replay transporting again, and finalization failure returning queued/ambiguous status.
- GREEN: 6/6 focused lifecycle tests pass. Queue precedes transport, queue failure calls zero transports, replay calls zero transports and returns the prior row, finalization failure preserves transport truth, and sender-scoped fallback fails closed.
- RED: People form partial/log-only outcomes left Send enabled; synchronous double click reached the action twice and no attempt key existed.
- GREEN: `PeopleMessageForm.test.tsx` 10/10 passes with a synchronous ref latch, stable unchanged-draft attempt UUID, accepted-outcome lock, and new UUID/unlock only after recipients/subject/body changes. Action/network rejection retains the same key.
- RED: the local pgTAP test failed on missing `sender_id`/`attempt_key`; the unique case-normalized recipient claim did not exist.
- GREEN: fresh reset plus pgTAP 9/9 passes; a separate local Postgres concurrency test proves exactly one of two simultaneous claims for case-variant email addresses succeeds and the loser receives `23505`.

### Send-time unavailable parity

- RED: a resolution with one available delivery and `unavailableCount = 1` still invoked the batch sender and returned success.
- GREEN: People action 31/31 passes; rejected references or any unavailable selection reject the whole send with the stable re-preview message and zero batch calls.

### Durable private bookkeeping

- RED: outbox insertion occurred after transport, persistence failure fell back to a sensitive full-row audit payload, and update failure did not preserve truthful counts.
- GREEN: queue-first lifecycle tests cover queue failure, duplicate claim, update failure, and log-only/queued replay behavior. Operational reporting uses only constant errors plus school/kind/stage/count. Recipient email/name, subject/body, selected IDs, attempt keys, and full rows are absent from audit/error fallback details.

### Teacher outbox and retry least privilege

- RED: service-role reads filtered only by school; teacher retry was leadership-only and queried only by arbitrary row ID; teacher page/stats called school-wide helpers. A mutation run removing the page filters failed the page ownership test.
- GREEN: lifecycle ownership, retry action, and page tests pass. Teacher reads/stats include verified `sender_id`; teacher retry lookup includes ID + school + sender; leadership retains school-wide access; forged/non-owned rows fail closed. Retry preserves origin ownership and has its own durable attempt claim.
- RED: Groups compose rows lacked verified sender. A mutation run removing `sender_id` failed the Groups compose regression test.
- GREEN: Groups manual compose passes the verified session user on every outbox row.
- Database GREEN: pgTAP proves teacher-one sees only their row, cannot see teacher-two's row, leadership sees both school rows, cross-school teacher sees none, and parent sees none.

### Accessibility minors

- RED: visible unchosen combobox options exposed active focus as `aria-selected=true`; More used partial ARIA menu/menuitem semantics and Escape did not restore focus.
- GREEN: combobox 18/18 passes with every unchosen option `aria-selected=false` while `aria-activedescendant` continues to represent focus. Header 4/4 passes with an ordinary navigation disclosure, unique `aria-controls`, links, outside click, Escape close, focus restoration, and existing desktop/mobile geometry checks. Local browser journeys pass with disclosure-link selectors.

## Verification evidence

- Focused application tests: 82 tests across lifecycle, actions, page, form, combobox, composer, header, and existing send tests passed.
- Full `npm run ci`: lint, typecheck, 104 test files / 533 tests, coverage thresholds, and Next production build passed.
- Full local Playwright: 18/18 passed, including desktop/mobile People journeys, outbox behavior, parent denial, and no-horizontal-overflow geometry.
- Hosted public smoke: 10/10 passed at `https://beacon.commoncentsip.com`.
- Hosted/remote-mode People suite: 4/4 fixture-authenticated tests skipped as designed; no forged hosted session and no hosted send.
- Full local pgTAP: 4 files / 99 tests passed.
- Local PostgREST/directory and concurrency integration: 2 files / 12 tests passed.
- Fresh local migration reset: passed from migration 001 through the new additive migration.
- Database lint: no schema errors.
- Database security advisors: no issues.
- Database performance advisors: command passed with existing repository-wide warnings for older auth init-plan and multiple-permissive policies; no warning identified the new outbox policy/index.
- Migration list: new migration present in local history. No linked/remote push or apply was run.
- `git diff --check`: passed.

Node 26.7 exposes an experimental global Web Storage implementation without a persistence file, which masks jsdom's `localStorage`. Browser/unit gates were therefore run with `NODE_OPTIONS=--no-webstorage`; this restores jsdom's normal storage and is an environment compatibility flag, not an application bypass. The pinned Supabase CLI is 2.111.0 and reported 2.112.0 available; the pinned version completed reset, tests, lint, advisors, and migration listing.

## Files

### Production and migration

- `supabase/migrations/20260808032938_email_outbox_delivery_integrity.sql`
- `src/lib/email/types.ts`
- `src/lib/email/send.ts`
- `src/app/actions/people-messaging.ts`
- `src/components/comms/PeopleMessageForm.tsx`
- `src/app/actions/communications.ts`
- `src/components/comms/ResendEmailButton.tsx`
- `src/app/(app)/admin/emails/page.tsx`
- `src/components/comms/PeopleRecipientCombobox.tsx`
- `src/components/layout/AppHeader.tsx`
- `scripts/e2e-supabase-mock.mjs`

### Tests and browser fixtures

- `src/lib/email/send.lifecycle.test.ts`
- `src/app/actions/people-messaging.test.ts`
- `src/components/comms/PeopleMessageForm.test.tsx`
- `src/app/actions/communications.retry.test.ts`
- `src/app/(app)/admin/emails/page.test.tsx`
- `src/components/comms/PeopleRecipientCombobox.test.tsx`
- `src/components/layout/AppHeader.navigation.test.tsx`
- `supabase/tests/email_outbox_delivery_integrity.test.sql`
- `tests/integration/email-outbox-idempotency.postgrest.test.ts`
- `vitest.people-directory-integration.config.ts`
- `e2e/people-messaging.spec.ts`

## Self-review

- Authorization: all service-role outbox reads are school-bound; teacher page/stats add sender binding; retry is ID + school + origin sender for teachers. RLS mirrors that model.
- Idempotency: uniqueness is enforced by Postgres, not timing-sensitive application reads. Replay never calls transport. Case is normalized both in stored new rows and in the index expression.
- Privacy: attempt UUIDs stay in an explicit private outbox column and are never placed in recipient metadata or rendered client props. New audit/error fallback details contain aggregates only.
- Truthfulness: queue failure returns failed before transport; finalization failure reports real transport counts with a note; queued replay is not described as delivered.
- Compatibility: non-People callers may omit sender/attempt. Existing row shape is additive. People and Groups manual callers set ownership.
- Accessibility: disclosure links avoid incomplete menu semantics; Escape returns focus; combobox focus and selection are no longer conflated.
- Fixture safety: Playwright uses `EMAIL_TRANSPORTS=log`; no production-only fixture branch was added to application code.

## Advisor notes and concerns

- Intentional advisor note: existing repository-wide performance warnings are outside this bounded change. The new RLS policy already wraps auth/helper calls in scalar `SELECT` and has a matching ownership index.
- Upgrade note: historical teacher-originated rows cannot be safely backfilled because the old schema did not record origin. They remain available to leadership only; new People/Groups/retry rows are owner-aware.
- Operational note: a crash after the queued insert but before finalization leaves a truthful durable `queued` row. Replaying the same attempt does not deliver again and reports in-progress; operational reconciliation of indefinitely queued rows is a future outbox-worker concern, not weakened here.
- No irreconcilable conflict with existing email callers was found; optional fields preserve their behavior while the People/retry boundary remains strict.
