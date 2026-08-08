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
