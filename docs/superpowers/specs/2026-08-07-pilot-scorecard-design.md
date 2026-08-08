# Beacon Pilot Scorecard Design

Date: 2026-08-07
Status: Approved direction; ready for implementation planning
Audience: school principals, Beacon product leadership, and pilot operators

## Purpose

Beacon needs evidence that a school is adopting the core pilot workflow. The first scorecard will answer a weekly operating question: are teachers doing the essential work, are linked parents reaching the family experience, are core records being completed, and is the experience generating manageable feedback?

The scorecard is an operating baseline, not a customer-success claim. The first four weeks will be labeled `Baseline gathering`. Beacon will not assign red, yellow, or green performance targets until a real pilot establishes a defensible baseline.

## Chosen Approach

Use a hybrid model:

1. Record a privacy-minimized daily activity ledger for authenticated adoption signals that existing tables cannot prove.
2. Derive workflow completion, communication delivery, and support volume from existing school-owned records.
3. Add a dedicated, low-friction parent feedback surface rather than treating general pilot suggestions as a satisfaction metric.

This is preferred over reusing `audit_logs`, which mixes security and operational history, and over full page-view analytics, which would collect more behavioral data than the pilot decision requires.

## Success Questions

The scorecard must let a principal answer these questions in under two minutes:

- How many teachers did meaningful work in Beacon during the last seven days?
- How many linked parents used the family experience during the last seven days?
- Are attendance and grade workflows producing usable records?
- Did family communications leave Beacon successfully?
- Are parents finding the experience helpful, and how large is the response sample?
- Is feedback volume manageable, or does it indicate rollout friction?

## Metric Framework

### Primary adoption metrics

#### Weekly active teachers

- Definition: distinct active teacher profiles with at least one `teacher_work` activity day in the trailing seven calendar days.
- Qualifying work: a successful grade save or attendance save.
- Denominator: active teacher profiles in the school.
- Display: `active / eligible` and percentage.
- Caveat: this measures use of Beacon's core workflow, not teacher quality or workload.

#### Weekly active linked parents

- Definition: distinct parent profiles linked to at least one active student with a `parent_portal` or successful `sign_in` activity day in the trailing seven calendar days.
- Denominator: distinct parent profiles linked to an active student in the school.
- Display: `active / eligible` and percentage.
- Caveat: multiple guardians may be linked to one student; this is account adoption, not household reach.

### Workflow drivers

#### Attendance activity

- Definition: distinct school days in the trailing seven calendar days with at least one attendance record, plus total attendance rows saved.
- Source: existing `attendance` rows joined through school-owned classes or students.
- Display: number of active attendance days and records, without claiming schedule completeness when Beacon does not have a canonical expected-day calendar.

#### Grade activity

- Definition: assignments with at least one grade saved in the trailing seven calendar days and total grade rows saved in that window.
- Source: existing `grades`, `assignments`, and school-owned classes.
- Display: active graded assignments and grade rows, without claiming every expected grade was entered.

#### Family communications delivered

- Definition: school email outbox items marked sent in the trailing seven calendar days, with failed or unsent items shown separately.
- Source: existing `email_outbox` delivery state.
- Display: delivered count and failed/unsent guardrail.
- Caveat: delivery does not prove an email was opened or understood.

### Parent experience signal

#### Helpful response share

- Definition: positive parent ratings divided by all submitted parent ratings in the trailing 30 calendar days.
- Display: positive count, total response count, and percentage only when at least five responses exist.
- Small sample behavior: with fewer than five responses, show counts and `Early signal - sample too small for a percentage`.
- No target is set during the four-week baseline period.

#### Feedback volume guardrail

- Definition: parent comments plus general pilot feedback submitted in the trailing seven calendar days.
- Display: new feedback count and a link to Principal -> Pilot feedback.
- Interpretation: volume is a triage signal, not automatically good or bad.

## Activity Ledger

Add `pilot_activity_daily` in the `public` schema because the hosted Data API client reads that schema. The table is server-only despite its schema location.

Columns:

- `school_id uuid not null`
- `user_id uuid not null`
- `actor_role text not null`
- `event_type text not null`
- `activity_date date not null default current_date`
- `created_at timestamptz not null default now()`

Allowed event types in the first release:

- `sign_in`
- `teacher_work`
- `parent_portal`

The primary key or unique constraint is `(school_id, user_id, event_type, activity_date)`. Repeated work on the same day updates no counter and stores no payload. This is intentionally a daily presence signal rather than a detailed behavior trail.

Security requirements:

- Enable row-level security.
- Revoke table privileges from `anon` and `authenticated`.
- Grant only the server service role the minimum required table privileges.
- Do not create permissive client policies.
- Record activity only after a server-side authorization check or successful authenticated operation.
- Never store a student identifier, page URL, IP address, user agent, note, form value, or action payload in this ledger.

Retention is a procurement decision that remains subject to counsel review. The first release must label this table in the procurement inventory and must not make a public deletion-period promise.

## Parent Feedback Surface

Add a compact card to the authenticated parent dashboard after the family feed:

- Prompt: `Was Beacon helpful for understanding school this week?`
- One-tap choices: `Yes` and `Not yet`.
- After a rating, reveal an optional comment field limited to 500 characters.
- Helper text: `Please do not include student names, medical details, or other sensitive information.`
- Confirmation: `Thank you - your school and the Beacon team can use this to improve the pilot.`

Use a dedicated `parent_experience_feedback` table rather than overloading `pilot_feedback`.

Columns:

- `id uuid primary key`
- `school_id uuid not null`
- `parent_id uuid not null`
- `rating text not null check (rating in ('helpful', 'not_yet'))`
- `comment text null check (char_length(comment) <= 500)`
- `surface text not null default 'parent_dashboard'`
- `created_at timestamptz not null default now()`

The first release allows one response per parent per seven-day reporting week and surface. A new week permits a new response, supporting trend measurement without repeated prompts becoming spam.

Access requirements:

- Parents may insert only their own response for their own school.
- Parents may read their own submitted response for the current reporting week.
- Principal and admin roles may read aggregate results and individual comments only within their school.
- Teachers and ordinary staff do not receive access through the scorecard.
- The server validates the caller's profile role and school before writing.

## Scorecard Interface

Add a `Pilot evidence` section to the Principal overview. Keep it summary-first and usable on a phone.

Layout:

1. Status row: trailing seven-day window and `Baseline gathering` badge during the first 28 days after the school's first recorded pilot activity.
2. Adoption cards: weekly active teachers and weekly active linked parents.
3. Workflow row: attendance activity, grade activity, and family communications delivered.
4. Parent signal card: response counts and positive share when the sample threshold is met.
5. Guardrail row: failed/unsent communications and new feedback volume.
6. Method note: plain-language definitions and explicit caveats.

Empty states must distinguish:

- no eligible users;
- eligible users but no recorded activity;
- migration or data-source unavailable;
- not enough parent ratings for a percentage.

The scorecard must never turn an unavailable query into a reassuring zero.

## Components and Boundaries

### `src/lib/pilot-analytics/activity.ts`

- Defines allowed event types.
- Records one daily activity row after validated server operations.
- Fails open and reports operational errors without blocking the user action.

### `src/lib/pilot-analytics/scorecard.ts`

- Loads school-scoped source rows.
- Produces a typed, presentation-neutral scorecard model.
- Keeps metric calculations pure where possible for deterministic tests.

### `src/components/principal/PilotScorecard.tsx`

- Renders the typed scorecard model.
- Contains no database calls.
- Handles baseline, empty, small-sample, and unavailable states.

### `src/components/parent/ParentExperienceFeedback.tsx`

- Renders the rating and optional comment workflow.
- Uses an authenticated server action.
- Announces validation and success states accessibly.

### Server integration points

- Successful login records `sign_in` after the caller's profile and school are resolved.
- Successful attendance and grade saves record `teacher_work` for teachers.
- Rendering the authenticated parent dashboard records `parent_portal` once per day.
- Measurement failures are logged through existing client-safe operational reporting and never change the primary workflow result.

## Data Flow

1. An authenticated school user completes an approved action.
2. The server resolves the trusted profile, school, and role.
3. The primary operation completes successfully.
4. Beacon upserts the daily activity row with no behavior payload.
5. The Principal overview requests the scorecard model for its own school.
6. The loader queries the daily ledger and existing school-owned operational tables in parallel.
7. Pure metric functions calculate counts, denominators, percentages, and display states.
8. The component renders the trailing-window evidence and caveats.

For parent feedback:

1. The parent selects a rating.
2. The server validates the authenticated parent, school membership, current reporting week, rating, and comment length.
3. Beacon inserts or updates that parent's current-week response.
4. The parent sees confirmation; the scorecard aggregate updates on the next request.

## Error Handling

- Activity recording is best-effort and cannot block login, grade save, attendance save, or parent dashboard access.
- Parent feedback submission returns a clear error and keeps the entered comment when validation or persistence fails.
- Scorecard source failures produce `Unavailable` for the affected metric and preserve other metrics that loaded successfully.
- Errors exposed to users are generic; detailed database messages remain server-side.
- Cross-school or wrong-role access fails closed.

## Testing Strategy

### Database tests

- `anon` and `authenticated` cannot read or write the activity ledger directly.
- A parent can submit only their own current-week response in their own school.
- Cross-school parent insert, select, and leadership aggregate access are denied.
- Comment length, rating values, and weekly uniqueness are enforced.

### Unit tests

- Daily activity deduplication inputs are normalized correctly.
- Teacher and parent denominators are school-scoped.
- Seven-day and 30-day boundary dates are deterministic.
- Parent percentage is withheld below five responses.
- Unavailable data never becomes zero.
- Baseline state lasts exactly 28 days from first activity.

### Integration tests

- Successful login records `sign_in`; failed login does not.
- Successful teacher grade or attendance save records `teacher_work` without changing the primary action response on measurement failure.
- Parent dashboard records `parent_portal` without storing page or student context.
- Parent rating and optional comment round-trip through the authenticated action.

### Browser tests

- Principal sees meaningful scorecard empty states in a fresh pilot.
- Parent can submit a one-tap rating and optional comment on mobile.
- Feedback controls meet 44px touch targets and expose accessible labels and status messages.
- Scorecard fits a 375px viewport without horizontal overflow.

## Rollout

1. Apply database migrations and security tests.
2. Deploy activity recording behind the existing authenticated workflows.
3. Confirm events appear only for the correct school and user.
4. Release the parent feedback card.
5. Release the Principal scorecard in `Baseline gathering` mode.
6. Review the first four weeks before proposing targets or publishing any outcome claim.

## Explicit Non-Goals

- No third-party product analytics SDK.
- No anonymous visitor tracking.
- No IP address, device fingerprint, user-agent, URL, or freeform activity payload collection.
- No student-level adoption scoring.
- No teacher performance ranking.
- No automated customer-success claims.
- No open-rate claim when Beacon only knows email delivery state.
- No pricing, renewal, or commercial target in the first scorecard.
