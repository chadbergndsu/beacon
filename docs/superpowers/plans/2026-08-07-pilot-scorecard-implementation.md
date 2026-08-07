# Pilot Evidence Scorecard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Beacon leadership an honest, privacy-minimized pilot scorecard and give parents a one-tap weekly helpfulness prompt with an optional comment.

**Architecture:** Add a server-only daily activity ledger for coarse usage signals and a separate, RLS-protected parent feedback table. Record activity only after successful authenticated workflows, aggregate tenant-scoped 7-day and 30-day evidence on the server, and render the result in the existing configurable principal overview. Keep every signal descriptive: no student scoring, teacher ranking, anonymous tracking, open tracking, or invented success targets.

**Tech Stack:** Next.js App Router server components/actions, TypeScript, React 19, Supabase Postgres/RLS, Zod, Tailwind/shadcn, Vitest, pgTAP, Playwright.

## Global Constraints

- Preserve the approved design in `docs/superpowers/specs/2026-08-07-pilot-scorecard-design.md`.
- Treat the first 28 days after the first captured activity as a baseline period; do not label a metric good or bad.
- Use only authenticated, school-scoped events. Never store student IDs, URLs, IP addresses, user agents, free-form event payloads, or anonymous browsing events in the activity ledger.
- Record only successful sign-ins, successful teacher grade/attendance saves, and verified parent-dashboard views. Tracking must be best effort and must never break the user workflow.
- Store parent comments only in the dedicated feedback table, cap them at 500 characters, and warn parents not to include student or sensitive information.
- Show a helpfulness percentage only for a rolling 30-day sample of at least five responses. Below five, show the response count and a small-sample message.
- Distinguish `no eligible users`, `no recorded activity`, `temporarily unavailable`, and `not enough responses`; never turn unavailable data into zero.
- Use the Supabase CLI to generate the migration. Explicitly grant every intended table privilege because newly created tables may not be auto-exposed to the Data API.
- Run the Supabase security and performance advisors after the migration is applied to the linked development project. Resolve newly introduced issues before rollout.
- Do not add a third-party analytics SDK.

## File and Responsibility Map

| Area | Files | Responsibility |
|---|---|---|
| Database contract | CLI-generated `supabase/migrations/*_pilot_scorecard_activity.sql`, `supabase/tests/pilot_scorecard.test.sql` | Tables, indexes, RLS, grants, tenant boundaries |
| Shared model | `src/lib/pilot-analytics/types.ts`, `src/lib/pilot-analytics/windows.ts`, `src/lib/pilot-analytics/windows.test.ts` | Date windows, result states, scorecard types |
| Activity capture | `src/lib/pilot-analytics/activity.ts`, `src/lib/pilot-analytics/activity.test.ts` | Best-effort, once-per-day server writes |
| Workflow wiring | `src/app/actions/auth.ts`, `src/app/actions/grades.ts`, `src/app/actions/attendance.ts`, `src/app/(app)/dashboard/page.tsx` | Record only successful authenticated workflows |
| Parent response | `src/lib/pilot-analytics/parent-feedback.ts`, `src/lib/pilot-analytics/parent-feedback.test.ts`, `src/app/actions/parent-feedback.ts`, `src/components/parent/ParentExperienceFeedback.tsx` | Validate, save, and render weekly response |
| Scorecard query | `src/lib/pilot-analytics/scorecard.ts`, `src/lib/pilot-analytics/scorecard.test.ts` | Tenant-scoped aggregation and explicit unavailable states |
| Leadership UI | `src/components/principal/PilotScorecard.tsx`, `src/app/(app)/principal/page.tsx`, `src/lib/view-prefs/registry.ts` | Principal/admin evidence card in configurable layout |
| Feedback review | `src/components/pilot/ParentExperienceFeedbackInbox.tsx`, `src/app/(app)/principal/feedback/page.tsx` | School-scoped review of individual parent comments |
| Disclosure and rollout | `src/app/privacy/page.tsx`, `src/lib/trust/trust-page.test.ts`, `docs/pilot-go-live.md`, `e2e/pilot-scorecard.spec.ts` | Honest data inventory, pilot instructions, mobile/browser verification |

---

## Task 1: Create the privacy-minimized database contract

**Files:**

- Create: CLI-generated `supabase/migrations/*_pilot_scorecard_activity.sql`
- Create: `supabase/tests/pilot_scorecard.test.sql`

- [ ] **Step 1: Write the failing pgTAP contract first**

Create `supabase/tests/pilot_scorecard.test.sql` with fixtures for two schools, a parent, a teacher, a principal, an office admin, and a second-school parent. Assert:

1. `pilot_activity_daily` and `parent_experience_feedback` exist and have RLS enabled.
2. `anon` and `authenticated` have no privileges on `pilot_activity_daily`; `service_role` has only `SELECT` and `INSERT`.
3. A parent can select, insert, and update only their own current-week response in their own school.
4. A parent cannot spoof another `parent_id`, another school, a future or past `week_start`, or a second response for the same week and surface.
5. Principals/admins can read their school’s parent feedback but not another school’s rows.
6. Teachers and office staff cannot read parent experience feedback.
7. Constraints reject an unsupported activity event, unsupported actor role, unsupported rating, and a comment longer than 500 characters.

Use role switching in the same style as `supabase/tests/authorization_boundaries.test.sql`. The core denial assertion should look like:

```sql
SELECT throws_ok(
  $$INSERT INTO public.parent_experience_feedback
      (school_id, parent_id, rating, surface, week_start)
    VALUES
      ('00000000-0000-0000-0000-000000000002',
       '00000000-0000-0000-0000-000000000101',
       'helpful', 'parent_dashboard', date_trunc('week', timezone('utc', now()))::date)$$,
  'new row violates row-level security policy for table "parent_experience_feedback"',
  'a parent cannot submit feedback into another school'
);
```

- [ ] **Step 2: Confirm the test fails because the schema does not exist**

Run:

```bash
supabase test db supabase/tests/pilot_scorecard.test.sql --local
```

Expected: failure identifying the missing pilot tables.

- [ ] **Step 3: Generate the migration through the Supabase CLI**

Run:

```bash
npx supabase migration new pilot_scorecard_activity
```

Use the exact path printed by the CLI for every remaining step in this task. Do not hand-invent or rename the timestamp.

- [ ] **Step 4: Add the two tables, indexes, grants, and RLS policies**

The migration must implement this contract:

```sql
CREATE TABLE public.pilot_activity_daily (
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_role text NOT NULL
    CHECK (actor_role IN ('admin', 'staff', 'principal', 'teacher', 'parent')),
  event_type text NOT NULL
    CHECK (event_type IN ('sign_in', 'teacher_work', 'parent_portal')),
  activity_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, user_id, event_type, activity_date)
);

CREATE INDEX pilot_activity_daily_school_window_idx
  ON public.pilot_activity_daily (school_id, activity_date DESC, actor_role, event_type);

ALTER TABLE public.pilot_activity_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pilot_activity_daily FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.pilot_activity_daily TO service_role;

CREATE TABLE public.parent_experience_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating text NOT NULL CHECK (rating IN ('helpful', 'not_yet')),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 500),
  surface text NOT NULL DEFAULT 'parent_dashboard' CHECK (surface = 'parent_dashboard'),
  week_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, parent_id, surface, week_start)
);

CREATE INDEX parent_experience_feedback_school_created_idx
  ON public.parent_experience_feedback (school_id, created_at DESC);

ALTER TABLE public.parent_experience_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.parent_experience_feedback FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.parent_experience_feedback TO authenticated;
GRANT SELECT ON TABLE public.parent_experience_feedback TO service_role;

CREATE POLICY parent_experience_feedback_parent_select
ON public.parent_experience_feedback
FOR SELECT TO authenticated
USING (
  parent_id = (SELECT auth.uid())
  AND school_id = (SELECT private.get_user_school_id())
  AND (SELECT private.get_user_role()) = 'parent'
  AND week_start = date_trunc('week', timezone('utc', now()))::date
);

CREATE POLICY parent_experience_feedback_parent_insert
ON public.parent_experience_feedback
FOR INSERT TO authenticated
WITH CHECK (
  parent_id = (SELECT auth.uid())
  AND school_id = (SELECT private.get_user_school_id())
  AND (SELECT private.get_user_role()) = 'parent'
  AND week_start = date_trunc('week', timezone('utc', now()))::date
);

CREATE POLICY parent_experience_feedback_parent_update
ON public.parent_experience_feedback
FOR UPDATE TO authenticated
USING (
  parent_id = (SELECT auth.uid())
  AND school_id = (SELECT private.get_user_school_id())
  AND (SELECT private.get_user_role()) = 'parent'
  AND week_start = date_trunc('week', timezone('utc', now()))::date
)
WITH CHECK (
  parent_id = (SELECT auth.uid())
  AND school_id = (SELECT private.get_user_school_id())
  AND (SELECT private.get_user_role()) = 'parent'
  AND week_start = date_trunc('week', timezone('utc', now()))::date
);

CREATE POLICY parent_experience_feedback_leadership_select
ON public.parent_experience_feedback
FOR SELECT TO authenticated
USING (
  school_id = (SELECT private.get_user_school_id())
  AND (SELECT private.get_user_role()) IN ('admin', 'principal')
);
```

Do not add client access policies to `pilot_activity_daily`. Service-role access is intentionally the only write/read route for that table.

- [ ] **Step 5: Run the database tests**

Run:

```bash
supabase test db supabase/tests/pilot_scorecard.test.sql --local
supabase test db supabase/tests --local
```

Expected: all pgTAP tests pass.

- [ ] **Step 6: Commit the database contract**

```bash
git add supabase/migrations supabase/tests/pilot_scorecard.test.sql
git commit -m "feat: add pilot evidence data boundaries"
```

---

## Task 2: Build the scorecard domain model and date-window rules

**Files:**

- Create: `src/lib/pilot-analytics/types.ts`
- Create: `src/lib/pilot-analytics/windows.ts`
- Create: `src/lib/pilot-analytics/windows.test.ts`

- [ ] **Step 1: Write failing unit tests for every display state**

Cover UTC day boundaries, ISO Monday week boundaries, trailing-seven-day inclusion, 28-day baseline status, ratios, zero eligible users, zero activity, unavailable data, and helpfulness suppression below five responses.

Required cases:

```ts
expect(isoWeekStart(new Date('2026-08-09T23:59:59Z'))).toBe('2026-08-03')
expect(isoWeekStart(new Date('2026-08-10T00:00:00Z'))).toBe('2026-08-10')
expect(buildRatioMetric({ active: 0, eligible: 0 })).toMatchObject({ state: 'no_eligible' })
expect(buildRatioMetric({ active: 0, eligible: 8 })).toMatchObject({ state: 'ready', percent: 0 })
expect(buildRatioMetric({ active: null, eligible: 8 })).toMatchObject({ state: 'unavailable' })
expect(buildHelpfulnessMetric({ helpful: 4, total: 4 })).toMatchObject({ state: 'small_sample' })
expect(buildHelpfulnessMetric({ helpful: 4, total: 5 })).toMatchObject({ state: 'ready', percent: 80 })
expect(isBaselinePeriod('2026-08-01', new Date('2026-08-28T23:59:59Z'))).toBe(true)
expect(isBaselinePeriod('2026-08-01', new Date('2026-08-29T00:00:00Z'))).toBe(false)
```

- [ ] **Step 2: Run the focused test and confirm red**

```bash
npm test -- src/lib/pilot-analytics/windows.test.ts
```

Expected: module-not-found failures.

- [ ] **Step 3: Implement explicit model types**

In `types.ts`, define discriminated unions so unavailable values cannot be accidentally rendered as zero:

```ts
export type RatioMetric =
  | { state: 'ready'; active: number; eligible: number; percent: number }
  | { state: 'no_eligible'; active: 0; eligible: 0 }
  | { state: 'unavailable'; reason: string }

export type CountMetric =
  | { state: 'ready'; count: number }
  | { state: 'unavailable'; reason: string }

export type WorkflowMetric =
  | { state: 'ready'; primary: number; secondary: number }
  | { state: 'unavailable'; reason: string }

export type HelpfulnessMetric =
  | { state: 'ready'; helpful: number; total: number; percent: number }
  | { state: 'small_sample'; helpful: number; total: number; minimum: 5 }
  | { state: 'unavailable'; reason: string }

export type DeliveryMetric =
  | { state: 'ready'; delivered: number; failed: number; unsent: number }
  | { state: 'unavailable'; reason: string }

export interface PilotEvidenceScorecard {
  windowStart: string
  windowEnd: string
  feedbackWindowStart: string
  baseline: boolean
  baselineDay: number | null
  activeTeachers: RatioMetric
  activeLinkedParents: RatioMetric
  attendanceActivity: WorkflowMetric
  gradeActivity: WorkflowMetric
  emailDelivery: DeliveryMetric
  parentHelpfulness: HelpfulnessMetric
  feedbackReceived: CountMetric
}
```

- [ ] **Step 4: Implement pure UTC helpers**

`windows.ts` must export:

```ts
export function utcDateKey(now: Date): string
export function isoWeekStart(now: Date): string
export function trailingWindow(now: Date, days: number): { start: string; end: string }
export function isBaselinePeriod(firstActivityDate: string | null, now: Date): boolean
export function baselineDay(firstActivityDate: string | null, now: Date): number | null
export function buildRatioMetric(input: { active: number | null; eligible: number | null }): RatioMetric
export function buildHelpfulnessMetric(input: { helpful: number | null; total: number | null }): HelpfulnessMetric
```

Percentages use `Math.round((numerator / denominator) * 100)`. Clamp neither raw counts nor dates; reject negative count inputs with an exception in tests.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- src/lib/pilot-analytics/windows.test.ts
git add src/lib/pilot-analytics
git commit -m "feat: define pilot evidence metrics"
```

---

## Task 3: Add best-effort daily activity capture

**Files:**

- Create: `src/lib/pilot-analytics/activity.ts`
- Create: `src/lib/pilot-analytics/activity.test.ts`
- Modify: `src/app/actions/auth.ts`
- Create: `src/app/actions/auth.test.ts`
- Modify: `src/app/actions/grades.ts`
- Create: `src/app/actions/grades.test.ts`
- Modify: `src/app/actions/attendance.ts`
- Create: `src/app/actions/attendance.test.ts`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Write the failing activity-writer tests**

Test that the writer:

- upserts one row using `school_id,user_id,event_type,activity_date` as the conflict target;
- derives `activity_date` in UTC;
- accepts only the five roles and three event types represented by TypeScript unions;
- returns `{ recorded: true }` on success;
- catches both client-construction and database errors, reports them, and returns `{ recorded: false }` without throwing.

Define the public interface under test as:

```ts
export type PilotActivityEvent = 'sign_in' | 'teacher_work' | 'parent_portal'

export async function recordPilotActivity(input: {
  schoolId: string
  userId: string
  actorRole: Role
  eventType: PilotActivityEvent
  now?: Date
}): Promise<{ recorded: boolean }>
```

- [ ] **Step 2: Confirm the focused test fails**

```bash
npm test -- src/lib/pilot-analytics/activity.test.ts
```

- [ ] **Step 3: Implement the best-effort writer**

Use `createAdminClient()`, `utcDateKey()`, and `reportError()`. The database call is:

```ts
await admin.from('pilot_activity_daily').upsert(
  {
    school_id: input.schoolId,
    user_id: input.userId,
    actor_role: input.actorRole,
    event_type: input.eventType,
    activity_date: utcDateKey(input.now ?? new Date()),
  },
  { onConflict: 'school_id,user_id,event_type,activity_date', ignoreDuplicates: true }
)
```

Check the returned `error`; do not assume a resolved promise means the write succeeded.

- [ ] **Step 4: Wire successful login without changing redirects**

Refactor `login()` so it resolves the signed-in user/profile immediately after `signInWithPassword`, regardless of the requested internal redirect. After a verified profile with a school, call:

```ts
await recordPilotActivity({
  schoolId: profile.school_id,
  userId: user.id,
  actorRole: effectiveRole(profile) ?? profile.role,
  eventType: 'sign_in',
})
```

Continue to `redirect()` even if recording fails. Keep generic credential errors and safe redirect handling unchanged.

- [ ] **Step 5: Wire successful teacher work only after persistence**

In `saveGrades()`, call the writer after a successful grades upsert and only when `role === 'teacher'`.

In `saveAttendance()`, derive the effective role from `access.profile`; call the writer after `upsertAttendanceBatch()` succeeds and only when the role is `teacher`. Leadership saving on a teacher’s behalf must not count as teacher activity.

- [ ] **Step 6: Wire verified parent dashboard views**

In the dashboard server component, after `getProfile()` verifies `role === 'parent'` and a non-null `school_id`, call `recordPilotActivity()` with `eventType: 'parent_portal'`. Await the best-effort helper so serverless execution is not abandoned after the response.

- [ ] **Step 7: Add workflow-level regression tests**

Mock `recordPilotActivity()` and assert:

- failed login never records;
- successful login records even with a valid non-default `next` path;
- rejected or failed grade/attendance saves never record;
- successful teacher grade/attendance saves record;
- successful principal/admin saves do not create `teacher_work` events;
- writer failure leaves each successful workflow successful.

Create the three action test files listed above using the repository’s Vitest module-mocking conventions. Do not inspect source text to prove integration behavior.

- [ ] **Step 8: Run focused tests and commit**

```bash
npm test -- src/lib/pilot-analytics/activity.test.ts src/app/actions/auth.test.ts src/app/actions/grades.test.ts src/app/actions/attendance.test.ts
npm run typecheck
git add src/lib/pilot-analytics src/app/actions src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: capture daily pilot activity"
```

---

## Task 4: Add the weekly parent helpfulness prompt

**Files:**

- Create: `src/lib/pilot-analytics/parent-feedback.ts`
- Create: `src/lib/pilot-analytics/parent-feedback.test.ts`
- Create: `src/app/actions/parent-feedback.ts`
- Create: `src/app/actions/parent-feedback.test.ts`
- Create: `src/components/parent/ParentExperienceFeedback.tsx`
- Create: `src/components/pilot/ParentExperienceFeedbackInbox.tsx`
- Create: `src/components/pilot/ParentExperienceFeedbackInbox.test.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/app/(app)/principal/feedback/page.tsx`
- Modify: `src/lib/view-prefs/registry.ts`

- [ ] **Step 1: Write failing validation and authorization tests**

The Zod schema accepts:

```ts
{
  rating: 'helpful' | 'not_yet',
  comment?: string,
  surface: 'parent_dashboard'
}
```

Trim comments, convert an empty comment to `null`, cap at 500 characters, and reject any other rating/surface. Action tests must verify unauthenticated, non-parent, and school-less profiles are rejected without writing.

- [ ] **Step 2: Run focused tests and confirm red**

```bash
npm test -- src/lib/pilot-analytics/parent-feedback.test.ts src/app/actions/parent-feedback.test.ts
```

- [ ] **Step 3: Implement the server action with the session client**

Use `getProfile()` and `effectiveRole()`; require `parent`, `profile.school_id`, and `user.id`. Upsert through the session-bound Supabase client so database RLS remains part of the enforcement path:

```ts
await supabase.from('parent_experience_feedback').upsert(
  {
    school_id: profile.school_id,
    parent_id: user.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
    surface: 'parent_dashboard',
    week_start: isoWeekStart(new Date()),
  },
  { onConflict: 'school_id,parent_id,surface,week_start' }
)
```

Return a small serializable state:

```ts
export type ParentFeedbackState = {
  ok?: boolean
  error?: string
  rating?: 'helpful' | 'not_yet'
}
```

Never echo the comment into the response or analytics logs.

- [ ] **Step 4: Load the current-week response on the parent dashboard**

Query only the authenticated parent’s current-week `rating` and `comment`. Pass it to the client component as initial state. A query failure should render the card in an unavailable state rather than hide the rest of the dashboard.

- [ ] **Step 5: Build the accessible one-tap component**

Render immediately after Family Feed with exact copy:

- Prompt: `Was Beacon helpful for understanding school this week?`
- Choices: `Yes` and `Not yet`
- Optional label: `Anything you want us to know?`
- Hint: `Please do not include student names, medical details, or other sensitive information.`
- Success: `Thank you - your school and the Beacon team can use this to improve the pilot.`

Both rating controls must be real submit buttons with at least a 44px target. Reveal the optional textarea after a rating is selected, or immediately when the current week already has a response. The textarea has `maxLength={500}` and remains editable if a parent updates the same week’s response. Preserve its text when submission fails. Announce success/errors with `role="status"` or `role="alert"`.

- [ ] **Step 6: Register the dashboard section**

Add this catalog entry after `parent_feed`:

```ts
{
  id: 'parent_feedback',
  label: 'Weekly parent feedback',
  description: 'One-tap helpfulness check with an optional note',
}
```

Add `parent_feedback` to the parent dashboard’s `presentSectionIds`, default layout, and section element map immediately after Family Feed.

- [ ] **Step 7: Add a leadership review surface for parent comments**

Export a server-only `listParentExperienceFeedbackForLeadership(schoolId, limit = 50)` function from `parent-feedback.ts`. It uses `createAdminClient()`, filters `.eq('school_id', schoolId)`, excludes null/blank comments, orders by `created_at` descending, and selects only `id`, `rating`, `comment`, and `created_at`. Do not resolve or display the parent’s name in this first release.

On `/principal/feedback`, keep the existing general Pilot Feedback inbox and add a `Parent experience` section beneath it. Render each item with `Helpful` or `Not yet`, the submitted date, and the comment. Add an empty state: `No parent comments yet.`

The component test must prove comments render without `parent_id`, email, child, or student data. The page remains protected by `requirePrincipal()`, and the loader always receives that function’s `schoolId`.

- [ ] **Step 8: Run focused tests and commit**

```bash
npm test -- src/lib/pilot-analytics/parent-feedback.test.ts src/app/actions/parent-feedback.test.ts src/components/pilot/ParentExperienceFeedbackInbox.test.tsx
npm run typecheck
git add src/lib/pilot-analytics src/app/actions/parent-feedback.ts src/app/actions/parent-feedback.test.ts src/components/parent/ParentExperienceFeedback.tsx src/components/pilot/ParentExperienceFeedbackInbox.tsx src/components/pilot/ParentExperienceFeedbackInbox.test.tsx src/app/\(app\)/dashboard/page.tsx src/app/\(app\)/principal/feedback/page.tsx src/lib/view-prefs/registry.ts
git commit -m "feat: add weekly parent experience feedback"
```

---

## Task 5: Build the tenant-scoped scorecard loader

**Files:**

- Create: `src/lib/pilot-analytics/scorecard.ts`
- Create: `src/lib/pilot-analytics/scorecard.test.ts`

- [ ] **Step 1: Write failing aggregation tests with a scripted Supabase double**

Cover:

- distinct active teachers versus eligible teacher profiles;
- distinct active linked parents versus distinct eligible linked parent profiles;
- distinct attendance dates plus rows touched in the trailing seven days using `updated_at`;
- distinct graded assignments plus grade rows entered in the trailing seven days via assignments/classes scoped to the school;
- email states: `sent` is delivered, `failed` is failed, `queued` and `skipped` are unsent;
- 30-day helpfulness calculation and the five-response threshold;
- count of general `pilot_feedback` plus parent comments submitted in the seven-day window;
- first activity date and 28-day baseline badge;
- one failed source becoming only that metric’s `unavailable` state;
- explicit school filters on every top-level query and no cross-school rows in results.

- [ ] **Step 2: Run the focused test and confirm red**

```bash
npm test -- src/lib/pilot-analytics/scorecard.test.ts
```

- [ ] **Step 3: Implement a principal-only loader boundary**

Export only:

```ts
export async function loadPilotScorecard(
  schoolId: string,
  now = new Date()
): Promise<PilotEvidenceScorecard>
```

The caller is responsible for obtaining `schoolId` through `requirePrincipal()`. This function uses `createAdminClient()` and must apply `.eq('school_id', schoolId)` at every table that has `school_id`.

- [ ] **Step 4: Load dependencies in bounded waves**

Use these definitions exactly:

1. **Eligible teachers:** active profiles at the school with role `teacher`. If profiles do not expose an active flag, all current teacher profiles are eligible and the UI says `teacher accounts` rather than `enabled teachers`.
2. **Active teachers:** distinct eligible teacher IDs with `teacher_work` activity in the trailing seven UTC dates. A sign-in alone does not count as meaningful teacher work.
3. **Eligible linked parents:** distinct parent IDs in `parent_students` connected to an active student at the school.
4. **Active linked parents:** distinct eligible parent IDs with `parent_portal` or `sign_in` activity in the trailing seven UTC dates.
5. **Attendance activity:** distinct `date` values and total attendance records whose `updated_at` falls inside the trailing seven-day timestamp window.
6. **Grade activity:** distinct assignments and total grade records with `entered_at` inside the window whose assignment belongs to a class in the school. Resolve school class IDs, then assignment IDs, then grade rows; an empty upstream ID set returns zero without an invalid `.in([], ...)` query.
7. **Email delivery:** outbox records created in the window, grouped into delivered (`sent`), failed (`failed`), and unsent (`queued`, `skipped`, or any non-final status).
8. **Parent helpfulness:** responses created in the trailing 30-day window; show a percentage only at five or more total responses.
9. **General feedback:** count `pilot_feedback` rows plus non-empty parent feedback comments created in the seven-day window. Label it `Feedback received`, not `support tickets`.
10. **Baseline start:** earliest activity date in `pilot_activity_daily` for the school.

Use `Promise.allSettled()` or per-source result wrappers so one operational table failure does not transform unrelated evidence into unavailable. Report failures with `reportError()` using only the source name and school ID; do not include row content.

- [ ] **Step 5: Run focused tests and commit**

```bash
npm test -- src/lib/pilot-analytics/scorecard.test.ts src/lib/pilot-analytics/windows.test.ts
npm run typecheck
git add src/lib/pilot-analytics
git commit -m "feat: aggregate pilot evidence scorecard"
```

---

## Task 6: Render the principal scorecard

**Files:**

- Create: `src/components/principal/PilotScorecard.tsx`
- Create: `src/components/principal/PilotScorecard.test.tsx`
- Modify: `src/app/(app)/principal/page.tsx`
- Modify: `src/lib/view-prefs/registry.ts`

- [ ] **Step 1: Write failing render tests**

Use server-rendered markup tests if the repository has no browser DOM unit environment. Assert the component shows:

- `Pilot evidence` and `Last 7 days`;
- `Baseline gathering · day N of 28` when baseline is true;
- `Baseline starts with first pilot activity` before the first captured activity;
- active/eligible counts and percentages for ready ratios;
- `No eligible teacher accounts yet` for `no_eligible`;
- `No activity recorded in this window` when eligible is positive and active is zero;
- `Temporarily unavailable` for unavailable metrics, never `0`;
- delivered, failed, and unsent email counts separately;
- `4 responses · not enough for a percentage` below five parent ratings;
- no green/red success judgement, target, teacher name, student name, or ranking language.

- [ ] **Step 2: Run the component test and confirm red**

```bash
npm test -- src/components/principal/PilotScorecard.test.tsx
```

- [ ] **Step 3: Implement the calm evidence card**

Use a responsive card grid with these labels:

- `Teachers active`
- `Linked parents active`
- `Attendance activity` with school days and records
- `Grade activity` with assignments and records
- `Email delivery`
- `Parent helpfulness`
- `Feedback received`

The feedback guardrail includes a text link to `/principal/feedback` labeled `Review feedback`. That destination shows existing general feedback and the new school-scoped parent comments.

Include plain-language footnotes:

- `Activity is deduplicated by person, workflow, and UTC day.`
- `These are pilot observations, not staff performance scores or outcome claims.`

Do not use progress-bar colors to imply pass/fail. Neutral Beacon brand colors and simple count typography are appropriate.

- [ ] **Step 4: Integrate with principal authorization and configurable layout**

In the principal page, call `loadPilotScorecard(schoolId)` only after `requirePrincipal()` has returned. Add the rendered section under key `pilot_evidence` directly after `beacon_signal` in the default principal and office-admin layouts.

Register:

```ts
{
  id: 'pilot_evidence',
  label: 'Pilot evidence',
  description: 'Seven-day activity, delivery, and parent feedback signals',
}
```

The page must continue rendering if the loader returns unavailable metrics.

- [ ] **Step 5: Run focused tests and commit**

```bash
npm test -- src/components/principal/PilotScorecard.test.tsx src/lib/pilot-analytics/scorecard.test.ts
npm run typecheck
git add src/components/principal src/app/\(app\)/principal/page.tsx src/lib/view-prefs/registry.ts
git commit -m "feat: show pilot evidence to school leaders"
```

---

## Task 7: Disclose, document, and verify the complete flow

**Files:**

- Modify: `src/app/privacy/page.tsx`
- Modify: `src/lib/trust/trust-page.test.ts`
- Modify: `docs/pilot-go-live.md`
- Create: `e2e/pilot-scorecard.spec.ts`

- [ ] **Step 1: Update the Trust & Data Practices inventory**

Add factual disclosure that Beacon may store:

- coarse authenticated product activity by school, person, role, workflow category, and UTC date;
- weekly parent helpfulness responses and optional comments;
- no student identity, URL, IP address, user agent, or arbitrary payload in the pilot activity ledger.

State that leadership can see aggregated pilot evidence and parent feedback for its school. Do not call the feature anonymous, FERPA-compliant, behavior monitoring, or outcome analytics.

- [ ] **Step 2: Expand Trust page tests**

Add positive assertions for `product activity`, `parent feedback`, and the no-payload boundary. Retain the existing prohibited-claim regex checks.

- [ ] **Step 3: Update the pilot go-live runbook**

Add a `Pilot evidence` section that tells operators:

1. apply every repository migration, including the new CLI-generated migration;
2. verify the parent prompt with a real linked parent account;
3. verify a teacher sign-in and one grade or attendance save;
4. verify the principal scorecard shows activity the next render;
5. confirm unavailable states are investigated rather than reported as zero;
6. review parent comments for sensitive details and follow the school’s approved handling process;
7. use the first 28 days as baseline evidence, not a performance target.

- [ ] **Step 4: Add the browser journey**

In `e2e/pilot-scorecard.spec.ts`, use deterministic seeded or E2E-mock data to cover:

- parent dashboard shows the prompt immediately after Family Feed;
- `Yes` and `Not yet` have 44px minimum targets;
- optional note enforces 500 characters and shows the sensitive-information hint;
- a submitted response becomes the current-week state;
- principal/admin sees the scorecard; teacher/parent does not;
- small sample omits the percentage;
- unavailable data is not rendered as zero;
- 390px-wide viewport has no horizontal overflow;
- keyboard focus order reaches both rating buttons and the comment field.

- [ ] **Step 5: Run the complete verification suite**

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
supabase test db supabase/tests --local
npx playwright test e2e/pilot-scorecard.spec.ts
git diff --check
```

Expected: all commands pass, with no new ignored failures or reduced coverage thresholds.

- [ ] **Step 6: Apply the migration to the linked development environment**

First confirm the linked project is the intended non-production project. Then run:

```bash
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

Expected: the pilot scorecard migration appears in both local and remote migration history.

- [ ] **Step 7: Run Supabase advisors and resolve newly introduced findings**

Use the Supabase security and performance advisors against the linked development project. Confirm:

- both new tables have RLS enabled;
- `pilot_activity_daily` has no anon/authenticated access path;
- parent feedback policies use indexed tenant/user columns;
- no function/search-path or privilege warning was introduced;
- no missing foreign-key index warning was introduced.

- [ ] **Step 8: Commit documentation and end-to-end coverage**

```bash
git add src/app/privacy/page.tsx src/lib/trust/trust-page.test.ts docs/pilot-go-live.md e2e/pilot-scorecard.spec.ts
git commit -m "docs: add pilot evidence rollout checks"
```

---

## Final Review Checklist

- [ ] Every approved scorecard metric is present and uses the documented 7-day or 30-day window.
- [ ] First-28-day baseline language is present and no success threshold was invented.
- [ ] Parent feedback is one response per parent, school, surface, and ISO week.
- [ ] Parent comments are capped, separated from the activity ledger, and never logged back to telemetry.
- [ ] Teachers and office staff cannot read parent experience feedback.
- [ ] Only principals/admins can load the scorecard.
- [ ] Every query is tenant-scoped and every unavailable source remains distinguishable from zero.
- [ ] Tracking failures never break login, grade saving, attendance saving, or parent dashboard rendering.
- [ ] No anonymous tracking, IP address, user agent, URL, student ID, or free-form event payload is stored.
- [ ] Trust copy matches the implementation without making compliance or outcome claims.
- [ ] Migration history, pgTAP, Vitest, build, Playwright, and Supabase advisors are clean.

## Completion Criteria

The slice is complete when a linked parent can answer the weekly prompt in one tap, a teacher can perform normal grade/attendance work without tracking affecting the workflow, and a principal/admin can see an honest baseline scorecard whose values are tenant-scoped, privacy-minimized, and tested across database, application, and browser layers.
