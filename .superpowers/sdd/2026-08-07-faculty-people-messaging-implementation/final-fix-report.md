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
- GREEN: `PeopleMessageForm.test.tsx` 10/10 passes with a synchronous ref latch, stable unchanged-draft attempt UUID, and accepted-outcome lock. Action/network rejection retains the same key. Round 2 below strengthens reset/unlock so it occurs only through the explicit new-message action.
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

## Final Fix Round 2 — completed-attempt lifecycle

### Architecture and behavior

- Every People action result with `ok: true`, including a fully sent result, now leaves the exact recipients, subject, body, status, and preview visible in a completed, locked state. Recipient search and message fields are disabled, and Send cannot issue another action call.
- `Start a new message` is the only completed-attempt reset boundary. It clears recipients, subject, body, preview, status, and errors; rotates the client attempt UUID; marks the composer clean; unlocks the controls; and restores focus to To. Partial, log-only, skipped-note, and full-success outcomes share this lifecycle.
- An `ok: false` People rejection or unknown/network failure remains editable/retryable and preserves the same attempt UUID, allowing server replay safety to resolve an uncertain request.
- Retry results now carry the private boolean discriminator `attemptCompleted: true` only when the send layer completed or replayed a transport lifecycle. A completed failed retry rotates the retry-action UUID before the next click, enabling a new durable delivery claim. Queue/action rejection and unknown failure omit the discriminator, retaining the same UUID for safe replay. Success and skipped behavior are unchanged.
- No schema or migration change was needed. The discriminator is action-control state only and is not persisted as recipient data.

### TDD RED/GREEN evidence

- RED — full-success People lifecycle: the stateful form test expected the successful draft to remain visible and locked, but recipients/subject/body were cleared and no `Start a new message` control existed. It also proved the old lifecycle silently rotated/unlocked after success.
- GREEN — full-success People lifecycle: `PeopleMessageForm.test.tsx` now proves recipients/subject/body are retained and disabled, repeat submission produces zero additional action calls, explicit new-message reset clears and focuses To, and the next valid draft uses a different attempt UUID. The existing rejection case was strengthened to prove an `ok: false` retry reuses the same UUID.
- RED — completed failed resend: the action test expected `attemptCompleted: true` after a real failed transport, and the button test expected a second click to use a new UUID. The action returned no discriminator and the button replayed the failed claim forever.
- GREEN — completed failed resend: send lifecycle, retry action, and new `ResendEmailButton.test.tsx` tests prove completed failed transport returns the discriminator and rotates the next claim; an actually rejected action renders a sanitized error and reuses its UUID; and a synchronous double click remains latched to one action call.
- RED — browser contract: the original People E2E attempted to edit To immediately after accepted log-only completion and timed out because the strengthened completed draft correctly disabled the combobox.
- GREEN — browser contract: the journey now verifies the completed fields are retained and disabled, activates `Start a new message`, verifies focus and cleared fields, and proceeds with the new draft. Focused People browser 4/4 and full Playwright 18/18 pass.

### Round 2 verification

- Focused form/retry/action/send tests: 6 files / 57 tests passed.
- Full `npm run ci`: lint, typecheck, 105 test files / 538 tests, coverage thresholds, and Next production build passed.
- Focused People Playwright: 4/4 passed after the explicit-new-message journey update.
- Full local Playwright: 18/18 passed.
- Full local pgTAP: 4 files / 99 tests passed. No database files changed in Round 2.
- `git diff --check`: passed before final commit.

### Round 2 files

- `src/components/comms/PeopleMessageForm.tsx`
- `src/components/comms/PeopleMessageForm.test.tsx`
- `src/components/comms/ResendEmailButton.tsx`
- `src/components/comms/ResendEmailButton.test.tsx`
- `src/app/actions/communications.ts`
- `src/app/actions/communications.retry.test.ts`
- `src/lib/email/send.ts`
- `src/lib/email/send.lifecycle.test.ts`
- `e2e/people-messaging.spec.ts`

### Round 2 self-review and concerns

- Attempt boundaries are explicit and asymmetric by design: accepted People outcomes lock until deliberate reset; uncertain People failures reuse the original claim; completed failed resend transport rotates before a new retry claim.
- The new discriminator does not expose the attempt key, recipient address, message content, provider detail, or operational failure text. Client-visible errors remain sanitized.
- The focus transition is tied to explicit reset state and verified in both component and browser tests. No automatic draft loss remains after any accepted People outcome.
- Existing non-People send callers remain compatible because `attemptCompleted` is an optional return-only field. No database upgrade or remote operation was required.
- Known environment-only warnings remain unchanged: Node's experimental Web Storage requires `NODE_OPTIONS=--no-webstorage` for jsdom, Next reports the existing multiple-lockfile root warning, and Playwright reports Node deprecation/color warnings. None affected gate results.

## Final Fix Round 3 — clean draft reset and queued retry replay

### Architecture and behavior

- The People form now advances a controlled draft generation when `Start a new message` is activated. That generation remounts the recipient combobox, clearing its private query, results, pending, empty, active-option, and error state while the old instance's unmount guard invalidates every in-flight search callback. The form's post-render focus effect targets the newly mounted To input.
- The remounted combobox performs its ordinary recent-reference reauthorization through the existing server action. It does not carry old rendered results across drafts, and a late result from the completed draft cannot populate the new draft.
- Retry actions now explicitly return `attemptCompleted: false` for `queued` replay and `attemptCompleted: true` for completed `sent` and `skipped` outcomes. A failed result still propagates completion only when the lower send lifecycle confirms transport completed.
- The retry button treats incomplete success as processing: it keeps the same retry-action UUID, renders a neutral outbox-status message, and does not call `router.refresh()`. Repeated clicks therefore replay the same queued claim. Completed sent, skipped, or failed attempts rotate; thrown/unknown actions retain the key.
- No migration, RLS, recipient metadata, or email payload changed in Round 3.

### TDD RED/GREEN evidence

- RED — clean new draft: the new stateful form test completed a send while a deferred People search was pending, activated `Start a new message`, and found the exact same To input instance with its private query/search state intact.
- GREEN — clean new draft: the form test proves the To input is a new instance with an empty value, no stale pending announcement or option, focus restored to the new input, and a late old-draft promise unable to repopulate it. Existing combobox authorization/recents tests remain green.
- RED — queued replay semantics: action tests showed queued retry returned generic `ok: true` without completion, sent/skipped omitted completion, and the button had no processing message and unconditionally rotated/refreshed every `ok: true` result.
- GREEN — queued replay semantics: action/button tests prove queued replay carries `attemptCompleted: false`, retains the same UUID over repeated clicks, renders calm processing copy, and performs no client refresh. Sent/skipped and confirmed failed completion rotate; rejected/unknown actions retain; synchronous double click remains latched.
- GREEN — durable replay: the send lifecycle test invokes the same duplicate queued claim twice and proves both return the prior `queued` row with zero transport calls.

### Round 3 verification

- Focused combobox/form/retry/action/send tests: 7 files / 83 tests passed.
- Full `npm run ci`: lint, typecheck, 105 test files / 546 tests, coverage thresholds, and Next production build passed.
- Full local Playwright: 18/18 passed, including both desktop and mobile People new-message journeys.
- `git diff --check`: passed before final commit.
- Database gates were not repeated because Round 3 changes no migration, query, policy, or database shape; the immediately preceding full local pgTAP result remains 4 files / 99 tests passed.

### Round 3 files

- `src/components/comms/PeopleMessageForm.tsx`
- `src/components/comms/PeopleMessageForm.test.tsx`
- `src/components/comms/ResendEmailButton.tsx`
- `src/components/comms/ResendEmailButton.test.tsx`
- `src/app/actions/communications.ts`
- `src/app/actions/communications.retry.test.ts`
- `src/lib/email/send.lifecycle.test.ts`

### Round 3 self-review and concerns

- The combobox generation boundary is scoped only to deliberate new-draft reset. It does not clear accepted completed content before the user acts, and it does not weaken recent-recipient authorization.
- Old search promises close over the unmounted combobox request counter; cleanup increments that counter before any late callback can apply results. New-instance requests use independent state.
- A queued retry never creates another transport claim from the button: the same client key reaches the same case-normalized unique claim, and the send layer returns the existing queued row without transport.
- No misleading resend-success copy is shown for queued replay. The neutral processing message directs the user to current outbox state without claiming delivery.
- No blocking concern remains. Existing Node/Next/Playwright environment warnings are unchanged.

## node26-test-environment

### Root cause and scope

- On Node 26.7.0 with no `--localstorage-file`, Node exposes experimental Web Storage but its getter returns `undefined`. Vitest's jsdom globals inherit that unavailable value, so `window.localStorage.clear()` failed in every People/Comms jsdom `beforeEach`.
- This was test-runner plumbing only. No production component, browser behavior, or runtime configuration changed.

### TDD RED/GREEN evidence

- RED: `src/test/local-storage-environment.test.ts` failed under plain Node 26/Vitest with `Cannot read properties of undefined (reading 'clear')`; the same test passed only when Node Web Storage was disabled externally.
- GREEN: Vitest now loads `src/test/setup/local-storage.ts`. In a jsdom worker it keeps a verified native Storage when available; otherwise it installs one in-memory standards-shaped instance on both `window.localStorage` and `globalThis.localStorage`. The fallback supports `length`, `key`, `getItem`, `setItem`, `removeItem`, and `clear`, with JavaScript string coercion and test-case reset isolation. Node-environment tests do nothing because the setup is guarded by `typeof window !== 'undefined'`.
- The existing quota-error regression now chooses the native `Storage.prototype` when available and the fallback instance otherwise, preserving the production behavior it covers across both storage implementations.

### Verification

- Focused regression plus the three formerly failing suites: 4 files / 37 tests passed under plain Node 26.7.0.
- The same focused 4 files / 37 tests passed under Node 22.23.2 with no environment flag, confirming the engine-range-compatible native-storage path.
- Full `npm run ci` without `NODE_OPTIONS`: lint, typecheck, 106 test files / 547 tests, coverage thresholds, and production build passed.
- Full `npm run test:e2e`: 18/18 passed.
- `git diff --check`: passed.

### Concern

- Node 26 still emits its own experimental-Web-Storage warning when Vitest initializes jsdom without a persistence file. The repository-level setup makes storage usable and no test command requires an environment flag; the warning is upstream Node behavior only.
