# Task 5 report — tenant-scoped pilot scorecard loader

## Status

Complete. `loadPilotScorecard(schoolId, now)` now aggregates the accepted pilot ledger and parent ratings with school-owned operational data. Every top-level table that owns `school_id` is explicitly filtered, downstream grade ownership is resolved through school classes, empty ID sets short-circuit, and source errors produce unavailable metrics without zero-filling unrelated evidence.

## Required guidance and current Supabase check

- Read `supabase:supabase`, `superpowers:test-driven-development`, and `writing-good-tests` before editing.
- Reviewed the current Supabase changelog, including the current breaking-change index. No current breaking change alters the `select`/filter query behavior used here.
- Reviewed the current Supabase JavaScript filter/select documentation. Queries use `select(...)` before chained filters, typed `eq`/`in`/range filters, and complete PostgREST response doubles: `{ data, error, count, status, statusText }`.

## RED evidence

Production change each test is designed to catch:

1. A missing/wrong tenant, role, activity-event, time-window, distinctness, status-grouping, helpfulness, feedback, or baseline branch changes the consumer-visible scorecard.
2. Removing a school filter permits scripted cross-school rows into the scorecard and fails both output and query-boundary assertions.
3. Converting a returned error or null data payload to an empty array changes `unavailable` into a false zero.
4. Calling `.in()` after an empty class ID set emits an invalid downstream query.

Initial collection run correctly failed because the requested module did not yet exist:

```text
npm test -- src/lib/pilot-analytics/scorecard.test.ts
FAIL  src/lib/pilot-analytics/scorecard.test.ts
Error: Cannot find module './scorecard'
Test Files  1 failed (1)
```

After adding only a deliberate unimplemented export, the behavioral RED run failed all four initial tests for the intended reason:

```text
npm test -- src/lib/pilot-analytics/scorecard.test.ts
Test Files  1 failed (1)
Tests       4 failed (4)
Error: Pilot scorecard loader is not implemented.
```

Mutation review then exposed a null-data honesty gap. The regression test failed before the fix with:

```text
expected { state: 'ready', primary: 0, secondary: 0 }
to deeply equal { state: 'unavailable', ... }
Tests  1 failed | 4 passed (5)
```

## GREEN evidence

Minimal implementation made the original suite pass, then the null-data fix restored GREEN:

```text
npm test -- src/lib/pilot-analytics/scorecard.test.ts src/lib/pilot-analytics/windows.test.ts
Test Files  2 passed (2)
Tests       22 passed (22)
```

Final required gates:

```text
npm run lint
eslint .
exit 0

npm run typecheck
tsc --noEmit
exit 0

npm test
Test Files  86 passed (86)
Tests       377 passed (377)
```

The full unit run had only the repository's existing intentional stdout/stderr coverage from email log-only and client-error tests; no failures occurred.

## Exact query and metric decisions

All timestamp windows are half-open UTC intervals. For the fixed test time `2026-08-07T16:30:00.000Z`, the seven-day timestamp interval is `[2026-08-01T00:00:00.000Z, 2026-08-08T00:00:00.000Z)` and the 30-day feedback start is `2026-07-09T00:00:00.000Z`. Ledger date keys use inclusive `gte 2026-08-01` / `lte 2026-08-07`.

- `profiles`: `select('id').eq('school_id', schoolId).eq('role', 'teacher')`. There is no profile active flag, so current teacher profiles are eligible teacher accounts.
- `students`: `select('id').eq('school_id', schoolId).eq('active', true)`.
- `parent_students`: `select('parent_id, student_id').in('student_id', activeSameSchoolStudentIds)`. Parent IDs are deduplicated; no query is issued for an empty student set.
- Teacher activity: `pilot_activity_daily.select('user_id').eq('school_id', schoolId).eq('actor_role', 'teacher').eq('event_type', 'teacher_work').gte('activity_date', start).lte('activity_date', end)`. Active IDs are intersected with eligible teacher IDs, so sign-in-only and non-eligible activity do not inflate the ratio.
- Parent activity: the same school/date boundary with actor role `parent` and `.in('event_type', ['parent_portal', 'sign_in'])`, intersected with eligible linked parent IDs.
- Attendance: `select('date').eq('school_id', schoolId).gte('updated_at', timestampStart).lt('updated_at', timestampEnd)`. `primary` is distinct attendance dates; `secondary` is touched rows.
- Grades: school-filtered `classes.select('id')`, then `assignments.select('id').in('class_id', classIds)`, then `grades.select('assignment_id').in('assignment_id', assignmentIds).gte('entered_at', timestampStart).lt('entered_at', timestampEnd)`. `primary` is distinct graded assignments; `secondary` is grade rows. Empty classes or assignments return a ready zero without `.in([])`.
- Email: `email_outbox.select('status').eq('school_id', schoolId)` plus the seven-day `created_at` interval. `sent` is delivered, `failed` is failed, and every other non-final state is unsent (including current `queued` and `skipped`).
- Parent helpfulness: `parent_experience_feedback.select('rating, comment, created_at').eq('school_id', schoolId)` plus the rolling 30-day interval. The existing helper suppresses percentage below five total responses.
- Feedback received: seven-day school-filtered `pilot_feedback.select('id')` plus parent rows from the shared 30-day response load whose `created_at` is in the seven-day interval and whose trimmed comment is nonblank. Either component failing makes only this combined metric unavailable; a parent-feedback failure also affects helpfulness.
- Baseline: `pilot_activity_daily.select('activity_date').eq('school_id', schoolId).order('activity_date', { ascending: true }).limit(1)`, passed to the established 28-day helpers.
- Returned Supabase errors, rejected queries, and unexpected `data: null` responses are reported with context exactly `{ source, schoolId }`; no row content is logged.

## Files

- Created `src/lib/pilot-analytics/scorecard.ts`.
- Created `src/lib/pilot-analytics/scorecard.test.ts`.
- Created this report.
- No principal UI/page files or schemas were changed.

## Mutation self-review

The scripted boundary and literal expectations were checked against these realistic mutations:

- Remove/change any top-level `school_id` equality: cross-school fixtures alter output and the emitted-filter loop fails.
- Count teacher sign-ins as work: asymmetric sign-in fixtures inflate active teachers and fail the ratio.
- Remove the teacher-role filter: the same-school parent profile inflates eligibility.
- Stop deduplicating parent links or activity IDs: repeated links/activity alter ratios.
- Stop intersecting activity with eligibility: non-eligible teacher/parent activity inflates active counts.
- Use `created_at` instead of attendance `updated_at`, stop deduplicating dates/assignments, or omit the upper timestamp bound: literal workflow counts fail, including exact next-window boundary fixtures.
- Swap delivered/failed handling or collapse queued/skipped: asymmetric email counts fail.
- Count whitespace-only parent comments or include 30-day comments in seven-day feedback: feedback count fails.
- Drop the five-response threshold: the four-response small-sample test fails.
- Convert a source error/null payload to empty data: the unavailable-state tests fail.
- Query assignments/grades with an empty ID array: the no-downstream-query assertion fails.

## Concerns / follow-ups

1. Supabase Data API projects commonly cap a single selected row set (often 1,000 rows). This task follows the repository's existing direct-select pattern; a larger school could eventually need pagination or database-side aggregates for exact high-volume weekly attendance/grade/email totals.
2. The inherited `PilotEvidenceScorecard` baseline fields have no `unavailable` state. A baseline-source failure is reported and produces `baseline: false, baselineDay: null`; unlike the metric unions, the model cannot distinguish that from no first activity until the interface is extended.

---

## Fix Round 1 — Important findings

Status: all three approved Important findings are fixed. The two original concerns above are resolved by exact pagination and the approved baseline status union.

### Test files

- `src/lib/pilot-analytics/scorecard.test.ts`
- `src/lib/pilot-analytics/windows.test.ts`

### RED 1 — exact pagination

Command:

```text
npm test -- src/lib/pilot-analytics/scorecard.test.ts
```

The scripted Supabase boundary enforces the configured 1,000-row response cap. A fixture with 1,001 attendance rows placed the second distinct date only on page two. Before pagination, the consumer-visible metric proved the truncation:

```text
expected { state: 'ready', primary: 2, secondary: 1001 }
received { state: 'ready', primary: 1, secondary: 1000 }
Test Files  1 failed (1)
Tests       1 failed | 5 passed (6)
```

### GREEN 1 — page contract

Every potentially multi-row scorecard read now uses the same deterministic contract:

- page size: exactly 1,000 rows;
- range offsets: zero-based and inclusive, `range(0, 999)`, `range(1000, 1999)`, and so on;
- termination: the first page shorter than 1,000 rows; an exact 1,000-row page intentionally causes one final empty-page read;
- no `count: 'exact'` shortcut, because distinct dates and IDs require all selected rows;
- filters are rebuilt identically on every page;
- stable order before every range:
  - profiles, students, classes, assignments, attendance, grades, email outbox, parent feedback, and general feedback: primary-key `id ASC`;
  - `parent_students`: `parent_id ASC, student_id ASC` (its composite primary key);
  - `pilot_activity_daily`: `user_id ASC, event_type ASC, activity_date ASC`, which is unique inside the fixed school/actor query (and teacher work fixes the event type).

The successful page-two assertion verifies both the final metric and emitted queries:

```text
attendance page 1: order('id', { ascending: true }).range(0, 999)
attendance page 2: order('id', { ascending: true }).range(1000, 1999)
metric: { state: 'ready', primary: 2, secondary: 1001 }
```

The earliest-activity query remains intentionally bounded rather than paginated: school filter, `activity_date ASC`, `limit(1)`.

### RED 2 — baseline status contract

Command:

```text
npm test -- src/lib/pilot-analytics/windows.test.ts src/lib/pilot-analytics/scorecard.test.ts
```

Before implementation, helper tests failed because `buildBaselineStatus` did not exist and loader tests received the old boolean fields:

```text
TypeError: buildBaselineStatus is not a function
expected { state: 'gathering', day: 19 }
received baseline: true, baselineDay: 19
expected { state: 'not_started' }, received false
expected { state: 'unavailable', ... }, received false
Test Files  2 failed (2)
Tests       8 failed | 20 passed (28)
```

`PilotEvidenceScorecard.baseline` is now presentation-neutral:

```ts
type BaselineStatus =
  | { state: 'not_started' }
  | { state: 'gathering'; day: number }
  | { state: 'complete' }
  | { state: 'unavailable'; reason: string }
```

Successful empty earliest activity returns `not_started`; UTC days 1–28 return `gathering` with a one-based day; UTC day 29 onward returns `complete`. Returned errors, rejected queries, and unexpected `data: null` each return `unavailable` and preserve source-only error reporting.

### RED 3 — parent profile ownership

Command:

```text
npm test -- src/lib/pilot-analytics/scorecard.test.ts
```

The linked-parent fixture includes two valid school parents plus a same-school wrong-role profile, a cross-school parent profile, and a nonexistent profile. All five have links and same-school ledger activity, so the old service-role path proved the denominator and numerator leak:

```text
expected { state: 'ready', active: 2, eligible: 2, percent: 100 }
received { state: 'ready', active: 5, eligible: 5, percent: 100 }
Test Files  1 failed (1)
Tests       2 failed | 10 passed (12)
```

After resolving active same-school students and their links, the loader now deduplicates linked IDs and intersects them through:

```text
profiles
  .select('id')
  .eq('school_id', schoolId)
  .eq('role', 'parent')
  .in('id', linkedParentIds)
  .order('id', { ascending: true })
  .range(...)
```

An empty active-student set skips `parent_students`; an empty linked-parent set skips the profile `.in()` query. Existing grade empty-set guards remain intact, and the suite asserts that no `.in([])` operation is emitted.

### Failure isolation added in this round

A `parent_experience_feedback` failure now has explicit fan-out coverage: only `parentHelpfulness` and combined `feedbackReceived` become unavailable. Teacher, parent, attendance, grade, email, and baseline evidence remain ready. Error context remains exactly `{ source, schoolId }`.

### Final GREEN and verification

Focused command:

```text
npm test -- src/lib/pilot-analytics/scorecard.test.ts src/lib/pilot-analytics/windows.test.ts
Test Files  2 passed (2)
Tests       31 passed (31)
```

Repository gates:

```text
npm run lint
eslint .
exit 0

npm run typecheck
tsc --noEmit
exit 0

npm test
Test Files  86 passed (86)
Tests       386 passed (386)
```

### Mutation self-review

- Remove `.range()` or stop after the first full page: the literal 1,001-row metric fails.
- Change page size/endpoints or omit stable ordering: emitted page-contract assertions fail.
- Return empty/false for a baseline source failure: the returned-error, rejection, and null-data cases fail.
- Shift the day-28/day-29 boundary: UTC helper expectations fail.
- Remove the school, role, or linked-ID profile filter: the cross-school/wrong-role/nonexistent fixtures enter the parent ratio and fail.
- Remove either empty-ID guard: the no-query assertions detect an empty `.in()` path.
- Convert parent feedback failure to zero or fan it out too broadly: the shared-source isolation test fails.

### Concerns

No blocking concern remains. Offset pagination is deterministic but not snapshot-isolated, so writes occurring between page requests could theoretically shift a live scorecard page. A database-side aggregate/RPC would be the future option if strict point-in-time reporting becomes necessary; the current read-only pilot scorecard now returns exact results for stable source data under the configured PostgREST cap.
