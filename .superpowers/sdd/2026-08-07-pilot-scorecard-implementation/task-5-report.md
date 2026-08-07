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
