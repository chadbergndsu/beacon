# Task 6 Report: Deterministic Faculty Browser Journey and Documentation

## Status

PASS. The authenticated faculty People journey, the reported teacher **More** menu regression, the local log-only outbox, denied-scope cases, parent redirect, responsive layout, and pilot-boundary documentation are implemented and verified.

## Browser RED/GREEN evidence

### In-app Browser availability

The in-app Browser was available and used first against the local application. Authentication used the normal `/login` form with the synthetic teacher fixture, then began the requested path at `/dashboard`; no hosted cookie was forged. The Browser showed the real application (`Beacon · School Suite`), no framework error overlay, and no console warnings or errors.

No Browser fallback was needed for manual acceptance evidence. The repository Playwright path was additionally used for the deterministic, repeatable fixture-authenticated test required by the brief. That test remains guarded with `test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), ...)`, so it cannot use fixture authentication against a hosted environment.

### RED

Command:

```text
npm run build && npx playwright test e2e/people-messaging.spec.ts
```

The initial browser test failed while waiting for the assigned student, after the desktop **More** menu, geometry, Comms navigation, and faculty search had already passed. The production People query exposed that the fixture did not yet provide the class, enrollment, student, linked-family, and outbox graph. After adding those rows, a second RED revealed that the old all-zero fixture identifiers were rejected by production UUID validation. With valid synthetic UUIDs, the next RED reached an application behavior gap: a correctly empty authorized search had no visible `No permitted people found` state.

### GREEN

The minimal production-path empty-result state was added to `PeopleRecipientCombobox`; no fixture-only application branch was introduced. The focused browser suite then passed 3/3:

- Desktop teacher starts at `/dashboard`, opens **More**, sees Lessons, Calendar, Printables, Scan, Craft, Comms, and School site, and follows Comms to `/admin/emails`.
- Desktop menu bounding box is below its trigger and entirely within the 1280×800 viewport.
- People is the default tab; Priya Principal plus Sam Student resolve to exactly 2 unique email recipients.
- Sam discloses one deliverable linked parent, Pat Parent; two linked parent profiles sharing one email deduplicate to one family delivery.
- One send in log-only mode produces exactly two skipped outbox attempts: the principal address and the deduplicated family address. The status is honest (`Sent 0 · 2 log-only`), identifies missing live transport configuration, and retains the subject/body as a draft.
- Unassigned and outside-school family searches display `No permitted people found`.
- A parent visiting `/admin/emails` is redirected to `/dashboard` and never sees the People tab.
- At 390×844, **More** opens with all seven items visible, remains within the viewport, and causes no horizontal overflow. The People flow also has no horizontal overflow.
- Relevant page and console errors are empty.

In-app Browser geometry independently confirmed desktop trigger bottom `45.25`, menu top `49.25`, menu right `982.76 < 1280`, and menu bottom `311.25 < 800`. On the mobile override, the menu was visible at approximately `x=199..367`, `y=95..357`, with all seven items and no horizontal overflow. Screenshots were inspected transiently and were not committed.

## Fixture and implementation notes

- The local Supabase fixture now uses only synthetic, valid UUIDs and supplies same-school faculty, an assigned student, an unassigned student, an outside-school student, linked parents, a teacher-owned class, and enrollment rows.
- Fixture filtering supports the production `eq`, `in`, `ilike`, and `or` query shapes. Inserted `email_outbox` rows are stored in memory, reset at fixture startup, returned in the production response shape, and remain individually queryable.
- Playwright forces `EMAIL_TRANSPORTS=log` and clears `RESEND_API_KEY`; no live mail or external system is contacted. The local public inquiry smoke test therefore verifies the honest unavailable state, while hosted public smoke retains the strict form checks.
- Fixture actor/school identifiers in the existing pilot scorecard journey were updated to the same valid UUID scheme.

## Documentation

The README now records:

- authenticated faculty/session and sender-derived tenant boundaries;
- teacher assigned-class scope and leadership full-school scope;
- student-to-linked-parent expansion, email deduplication, and individual outbox visibility;
- synthetic local fixture data and log-only delivery with no external systems;
- the controlled-pilot posture; and
- SSO, MFA, managed account lifecycle, account recovery, and incident response as broader production gates that this feature does not imply or satisfy.

## Verification commands and results

```text
npx vitest run src/lib/email/people-types.test.ts src/lib/email/people-directory.test.ts src/app/actions/people-messaging.test.ts src/components/comms/PeopleRecipientCombobox.test.tsx src/components/comms/PeopleMessageForm.test.tsx src/components/comms/CommunicationsComposer.test.tsx
PASS — 6 files, 85 tests

npm run ci
PASS — lint, typecheck, 517 coverage tests and thresholds, production build

npm run test:e2e
PASS — 17/17 local browser tests

PLAYWRIGHT_BASE_URL=https://beacon.commoncentsip.com npx playwright test e2e/public-smoke.spec.ts
PASS — 10/10 hosted public smoke tests; fixture-authenticated tests remain skipped remotely

npm run lint && npm run typecheck && git diff --check
PASS

npm run build && npx playwright test e2e/people-messaging.spec.ts
PASS — production build and 3/3 focused browser tests
```

## Security and privacy review

- Sender authorization begins with the authenticated session and a matching school/role profile.
- Service-role faculty, parent, student, class, enrollment, and link resolution is school-bound or restricted to IDs proven through a sender-school query.
- Teacher search, preview, and send intersect students and parents with assigned-class scope; unassigned and outside-school family data is not disclosed.
- Forged or stale recipient references reject the whole send with a generic error.
- Client actions exchange recipient kind/id references, not email addresses; search/preview responses do not expose emails.
- Local storage contains only recipient kind/id references.
- Audit details contain counts and delivery mode/status only—no body, email, recipient name, or selected IDs.
- The browser fixture uses log-only delivery and synthetic data; no live email or external system is used.
- No Supabase migration was added.

## Files changed

- `e2e/people-messaging.spec.ts`
- `scripts/e2e-supabase-mock.mjs`
- `playwright.config.ts`
- `README.md`
- `src/components/comms/PeopleRecipientCombobox.tsx`
- `e2e/pilot-scorecard.spec.ts`
- `e2e/public-smoke.spec.ts`
- this report

## Concerns

No product blocker remains. During one mobile Browser inspection, direct locator bounding-box dispatch exceeded the Browser tool's three-second deadline; the same geometry returned immediately through page evaluation and was independently GREEN in Playwright. This was a tooling-only transient, not an application failure. Existing build warnings about multiple lockfiles and `NO_COLOR` remain outside this task; no relevant runtime console issue was observed.

## Fix Round 1 — Important and mock-fidelity findings

### RED evidence

The fix-round browser/fixture tests were written before changing the mock or Playwright environment.

1. `npx playwright test e2e/people-messaging.spec.ts --workers=1` failed in the new `beforeEach` because `POST /__e2e/reset` returned 404. The serial suite stopped before all three role journeys, proving accumulated global outbox state could not silently satisfy the new exact-count checks.
2. Once the reset and shared query modifier path existed, the contract test exposed a modifier bug: a request without `limit` was interpreted as limit zero and returned `[]` instead of the two case-variant parent rows. The absent-limit branch was corrected and the same direct contract then passed.
3. `SMTP_HOST=smtp.example.test npx playwright test e2e/people-messaging.spec.ts --workers=1` failed at the exact readiness assertion because the Comms page no longer rendered `Log-only mode — not yet reaching inboxes`. This proved the local web server still inherited a live SMTP setting despite `EMAIL_TRANSPORTS=log`.

### GREEN behavior

- Desktop and 390×844 mobile now each execute the complete `/dashboard` → **More** → Comms → People journey. Each test starts from an explicit mock reset, sees exactly seven menu items, verifies the menu is below the trigger and fully within the viewport, selects Priya Principal and Sam Student, confirms the linked-parent disclosure and exactly two unique email recipients, sends once, retains the honest draft/note, denies Outside, and observes exactly two skipped outbox rows with no horizontal overflow.
- The second linked parent's fixture email is `PILOT-FAMILY@BEACON.TEST`, while the first is `pilot-family@beacon.test`. The real directory/send path still reports one linked family recipient and records one normalized family destination plus the principal destination.
- `POST /__e2e/reset` exists only on the loopback test fixture, clears the in-memory outbox and its deterministic sequence, and runs before every test in the serial local-only suite. `--repeat-each=2` passed 8/8, proving consecutive reruns remain exact.
- Outbox IDs now use deterministic UUIDv4-shaped values. The direct fixture contract verifies reset, valid IDs, descending order, limit, projection, and the production quoted PostgREST `or`/`ilike` grammar for literals containing `%`, `_`, comma, parentheses, quote, and backslash. A close decoy row is excluded.
- The local Next web-server environment explicitly clears `RESEND_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, and `SMTP_URL`. Even when Resend and SMTP values are injected into the Playwright command, the page reports log-only and all four focused tests pass without contacting a live system.
- The hosted `PLAYWRIGHT_BASE_URL` guard skips all four fixture tests before `beforeEach` or fixture-cookie setup.

### Fix-round Browser availability

The in-app Browser runtime was callable, but its retained binding returned `Browser is not available`; reconnecting to the local target then returned `No browser is available` at browser acquisition. Per the task's allowed deterministic-auth fallback, rendered fix-round evidence therefore came from the repository Playwright path. No screenshot or trace was committed. The earlier Task 6 in-app Browser evidence above remains valid for the production UI, while the new mobile full-flow, parser, retry, and injected-environment checks are reproducible automated evidence.

### Fix-round verification

```text
npx playwright test e2e/people-messaging.spec.ts --workers=1
PASS — 4/4 focused fixture, desktop, mobile, and parent-role tests

SMTP_HOST=smtp.example.test SMTP_URL=smtps://fixture:secret@smtp.example.test:465 RESEND_API_KEY=re_fixture npx playwright test e2e/people-messaging.spec.ts --workers=1
PASS — 4/4; local readiness and sends remain log-only under injected live settings

npx playwright test e2e/people-messaging.spec.ts --workers=1 --repeat-each=2
PASS — 8/8 consecutive tests with exact outbox reset/counts

npx vitest run src/lib/email/people-types.test.ts src/lib/email/people-directory.test.ts src/app/actions/people-messaging.test.ts src/components/comms/PeopleRecipientCombobox.test.tsx src/components/comms/PeopleMessageForm.test.tsx src/components/comms/CommunicationsComposer.test.tsx
PASS — 6 files, 85/85 tests

npm run ci
PASS — lint, typecheck, 517/517 coverage tests and thresholds, production build

npm run test:e2e
PASS — 18/18 local browser tests

PLAYWRIGHT_BASE_URL=https://beacon.commoncentsip.com npx playwright test e2e/public-smoke.spec.ts
PASS — 10/10 hosted public smoke tests

PLAYWRIGHT_BASE_URL=https://beacon.commoncentsip.com npx playwright test e2e/people-messaging.spec.ts
PASS — 4/4 skipped before fixture reset or authentication

npm run lint; npm run typecheck; git diff --check
PASS
```

### Fix-round self-review

- Changes remain confined to the local E2E test, its mock server, local Playwright environment, and this report; no production application branch or migration was added.
- The reset endpoint is bound with the fixture to loopback and resets only People outbox state, avoiding interference with unrelated parent-feedback fixture state.
- The suite is explicitly serial, while the full nine-worker local E2E run passed, covering the selected isolation model under repository parallelism.
- Filtering, projection, ordering, and limiting share one mock request path; the contract does not test a second parser or duplicate the production implementation.
- Case-variant synthetic addresses are normalized only by the real People directory/send logic, not by a special mock response.
- No external mail transport was configured or attempted; no live, personal, or non-synthetic fixture data was used.

No product concern remains. The only fix-round limitation is the recorded in-app Browser acquisition outage; deterministic Playwright covered every new rendered assertion, including the complete 390×844 flow.
