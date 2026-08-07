# Task 4 report: weekly parent helpfulness prompt

## Status

Implemented the first parent experience signal on the parent dashboard and the principal/admin comment review surface on the existing Pilot Feedback page. Existing parent portal activity tracking and the general Pilot Feedback inbox remain intact. No scorecard aggregation or scorecard UI was added.

## Behavior delivered

- Added validation for `helpful` / `not_yet`, fixed `parent_dashboard` surface, trimmed optional comments, blank-to-null normalization, and the 500-character boundary.
- Added an authenticated server action that calls `getProfile()` and `effectiveRole()`, requires a signed-in parent and school, and upserts the current UTC ISO-week response through the session-bound Supabase client.
- Added the parent dashboard card immediately after Family Feed and registered `parent_feedback` immediately after `parent_feed` in view preferences and the parent page layout.
- Loads only `rating` and `comment` for the signed-in parent's current school/surface/week. Query errors render the card disabled with an accessible unavailable message without interrupting the rest of the dashboard.
- Added the exact prompt, choices, optional label, sensitive-information hint, and success copy. Both choices are submit buttons with 44px targets; an existing response reveals an editable 500-character textarea.
- Added a school-scoped leadership loader that selects only `id`, `rating`, `comment`, and `created_at`, excludes null/empty/whitespace-only comments, orders newest first, and maps results into a safe field-only type.
- Added a `Parent experience` section beneath the existing Pilot Feedback inbox. It displays only Helpful / Not yet, submitted date, and comment, with `No parent comments yet.` as its empty state.
- Enabled Vitest discovery for required `.test.tsx` behavior tests.

## TDD evidence

### RED 1: validation and action authorization

Command:

```text
npm test -- src/lib/pilot-analytics/parent-feedback.test.ts src/app/actions/parent-feedback.test.ts
```

Observed failure: 2 failed suites because both production modules were absent. This established the validation and authorization/persistence boundary before implementation.

### GREEN 1

The same command then passed:

```text
Test Files  2 passed (2)
Tests       14 passed (14)
```

### RED 2: leadership-safe loader and inbox

Command:

```text
npm test -- src/lib/pilot-analytics/parent-feedback.test.ts src/app/actions/parent-feedback.test.ts src/components/pilot/ParentExperienceFeedbackInbox.test.tsx
```

Observed failure: the leadership loader was not a function (2 behavior failures) and the inbox module did not exist. Existing action tests stayed green.

### GREEN 2

The same command then passed:

```text
Test Files  3 passed (3)
Tests       18 passed (18)
```

### RED 3: parent card and page integration

Command:

```text
npm test -- src/components/parent/ParentExperienceFeedback.test.tsx src/app/(app)/dashboard/page.test.ts src/app/(app)/principal/feedback/page.test.ts
```

Observed failure: the parent card module was absent; the dashboard issued no weekly feedback query and rendered no unavailable card; the principal page did not call the parent experience loader.

### GREEN 3 / combined focused verification

Command:

```text
npm test -- src/lib/pilot-analytics/parent-feedback.test.ts src/app/actions/parent-feedback.test.ts src/components/parent/ParentExperienceFeedback.test.tsx src/components/pilot/ParentExperienceFeedbackInbox.test.tsx src/app/(app)/dashboard/page.test.ts src/app/(app)/principal/feedback/page.test.ts
```

Output:

```text
Test Files  6 passed (6)
Tests       27 passed (27)
```

The tests assert real normalized outputs, returned action states, database-boundary payloads, query scopes, rendered HTML, private-field absence, inaccessible-state behavior, and authorized school propagation. Supabase itself is mocked only at the external database boundary.

## Final verification

```text
npm run typecheck
> tsc --noEmit
exit 0

npm run lint
> eslint .
exit 0

npm test
Test Files  85 passed (85)
Tests       368 passed (368)
exit 0

git diff --check
exit 0
```

The current Supabase changelog and official SSR/Auth, `getUser`, RLS, and JavaScript upsert documentation were reviewed before implementation. No relevant breaking change altered the established session-client/RLS pattern. The action re-authorizes internally, and the service-role client is used only for the leadership read after `requirePrincipal()` supplies the authorized school ID.

## Files

- `src/lib/pilot-analytics/parent-feedback.ts`
- `src/lib/pilot-analytics/parent-feedback.test.ts`
- `src/app/actions/parent-feedback.ts`
- `src/app/actions/parent-feedback.test.ts`
- `src/components/parent/ParentExperienceFeedback.tsx`
- `src/components/parent/ParentExperienceFeedback.test.tsx`
- `src/components/pilot/ParentExperienceFeedbackInbox.tsx`
- `src/components/pilot/ParentExperienceFeedbackInbox.test.tsx`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/dashboard/page.test.ts`
- `src/app/(app)/principal/feedback/page.tsx`
- `src/app/(app)/principal/feedback/page.test.ts`
- `src/lib/view-prefs/registry.ts`
- `vitest.config.ts`

## Accessibility and performance self-review

- The Yes and Not yet controls are semantic submit buttons, expose pressed state, and use 44px (`h-11` / `min-h-11`) targets.
- The optional textarea has a programmatic label, hint association, `maxLength={500}`, and remains uncontrolled so typed text is retained when a server response reports failure.
- Success and failure/unavailable messages use `role="status"` and `role="alert"` respectively.
- The leadership list uses semantic section, heading, list, badge text, and `<time dateTime>` elements.
- The dashboard performs one narrow current-week single-row query only for a parent with a school. Leadership feedback loaders run concurrently with `Promise.all`, and no identity/student lookup or client-side leadership JavaScript was added.
- The parent client component receives only rating/comment initial state and never receives parent, child, or student identity.

## Concerns

- No blocking concerns.
- Interaction behavior is covered through server-rendered component contracts and server-action tests; a browser E2E test was not added in this task. The existing database migration/RLS SQL was created and tested by the preceding task and was not modified here.

## Fix Round 1

### Findings and fixes

1. React 19 resets uncontrolled fields after a form action completes. The textarea used `defaultValue`, so a failed or successful update reverted the DOM value to the last server-rendered comment. `ParentExperienceFeedback` now owns a controlled `commentDraft` state and submits that value without letting the action reset replace it. A jsdom + Testing Library interaction test now types an edited note, submits a real React form action, and verifies the note survives both failure and success responses; the success case also verifies the updated rating state.
2. `resolveScreenLayout()` previously kept all saved IDs first and appended every catalog addition. A saved dashboard layout created before `parent_feedback` therefore placed the card after Announcements. Missing catalog IDs are now inserted after the nearest present catalog predecessor, or before the nearest successor, while saved IDs retain their user-defined order.
3. The parent dashboard awaited activity, then feedback, before starting other independent parent work. Activity, feedback, children, announcements, and billing now start immediately. Only the child result is awaited for child-dependent missing-work/section decisions; feedback, announcements, billing, activity, and view preferences are joined before render. The regression test holds activity and feedback unresolved and proves feedback, child, announcement, and view-preference work have already started.

The earlier accessibility self-review statement that called the textarea uncontrolled is superseded by Fix Round 1: the field is now controlled specifically to preserve drafts across React form-action responses.

### Covering tests

- `src/components/parent/ParentExperienceFeedback.test.tsx`
- `src/lib/view-prefs/resolve.test.ts`
- `src/app/(app)/dashboard/page.test.ts`

### RED evidence

Component interaction command:

```text
npm test -- src/components/parent/ParentExperienceFeedback.test.tsx
```

Failing output before the fix:

```text
Test Files  1 failed (1)
Tests       2 failed | 3 passed (5)
preserves an edited comment after a failed update:
  expected 'Saved note.' to be 'Keep this draft after failure.'
keeps the edited comment and selected rating after a successful update:
  expected 'Saved note.' to be 'Updated note.'
```

Legacy layout command:

```text
npm test -- src/lib/view-prefs/resolve.test.ts
```

Failing output before the fix:

```text
Test Files  1 failed (1)
Tests       1 failed | 4 passed (5)
Expected: parent_feed, parent_feedback, announcements
Received: parent_feed, announcements, parent_feedback
```

Dashboard concurrency command:

```text
npm test -- src/app/(app)/dashboard/page.test.ts
```

Failing output before the fix:

```text
Test Files  1 failed (1)
Tests       1 failed | 5 passed (6)
starts independent parent loaders before activity or feedback finishes:
  expected feedback queries [] to have a length of 1
```

### GREEN evidence

Exact combined regression command:

```text
npm test -- src/components/parent/ParentExperienceFeedback.test.tsx src/lib/view-prefs/resolve.test.ts src/app/(app)/dashboard/page.test.ts
```

Passing output after all three fixes:

```text
Test Files  3 passed (3)
Tests       16 passed (16)
```

Additional verification:

```text
npm run typecheck
> tsc --noEmit
exit 0

npm run lint
> eslint .
exit 0

git diff --check
exit 0
```

### Fix-round concerns

- No blocking functional concern remains in the three reported findings.
- Real DOM interaction coverage required adding test-only `@testing-library/react`, `@testing-library/user-event`, and `jsdom` dependencies. `npm install` reports seven high-severity audit findings in the repository dependency tree; dependency remediation is outside this narrowly scoped fix round.
