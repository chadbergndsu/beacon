# Task 6 report — Principal pilot scorecard

## Status

Implemented the presentation-neutral pilot evidence scorecard in the configurable Principal overview. The scorecard is a synchronous server-rendered component, receives the accepted `PilotEvidenceScorecard` model as a prop, and contains no data access or client directive.

The Principal page now starts pilot evidence loading only after `requirePrincipal()` returns the authorized `schoolId`. Billing, Beacon Signal, pilot evidence, school summary, and layout work then start together and are awaited as one group. Both principal and office-admin default layouts place `pilot_evidence` immediately after `beacon_signal`; the catalog placement also preserves that position when resolving legacy saved layouts.

## RED evidence

### Component render cycle

Command:

```text
npm test -- src/components/principal/PilotScorecard.test.tsx
```

Observed before implementation:

```text
FAIL src/components/principal/PilotScorecard.test.tsx
Error: Cannot find module './PilotScorecard'
Test Files 1 failed (1)
```

The failure was caused by the missing production component, which was the intended behavior under test.

### Page integration and layout cycle

Command:

```text
npm test -- 'src/app/(app)/principal/page.test.tsx' src/lib/view-prefs/resolve.test.ts
```

Observed before integration:

```text
Test Files 2 failed (2)
Tests 5 failed | 5 passed (10)
```

The failures confirmed all intended missing behavior: the pilot loader had zero calls, both leader layouts lacked `pilot_evidence`, the catalog entry was absent, legacy insertion could not occur, and no unavailable scorecard section rendered.

## GREEN evidence

Focused render and integration cycle after implementation:

```text
npm test -- src/components/principal/PilotScorecard.test.tsx 'src/app/(app)/principal/page.test.tsx' src/lib/view-prefs/resolve.test.ts
Test Files 3 passed (3)
Tests 17 passed (17)
```

Final focused verification, including the underlying scorecard loader:

```text
npm test -- src/components/principal/PilotScorecard.test.tsx 'src/app/(app)/principal/page.test.tsx' src/lib/view-prefs/resolve.test.ts src/lib/pilot-analytics/scorecard.test.ts
Test Files 4 passed (4)
Tests 33 passed (33)
```

Repository gates:

```text
npm run typecheck
exit 0, no diagnostics

npm run lint
exit 0, no diagnostics

npm test
Test Files 88 passed (88)
Tests 401 passed (401)
```

The full suite emitted only the repository's expected test logging from client-safe error and forced log-only email cases; there were no test failures.

## Behavior covered

- Ready ratios show active, eligible, and percentage values.
- No-eligible, eligible-with-zero-activity, and unavailable ratios remain distinct.
- Attendance shows school days and records; grade activity shows assignments and records.
- Delivered, failed, and unsent email counts remain separate, including real zero counts.
- Parent helpfulness shows a percentage only at five or more responses; the small-sample state renders `4 responses · not enough for a percentage`.
- Feedback ready-zero and unavailable states remain distinct, and `Review feedback` links to `/principal/feedback`.
- Baseline states render as not started, gathering with day number, complete with a plain method note, or temporarily unavailable.
- Unavailable metrics never render as zero.
- Required deduplication and non-performance-score caveats appear exactly.
- Tests guard against judgment, target, ranking, and person-name language.
- The page renders a real unavailable scorecard model rather than dropping the section.
- The authorization/concurrency test proves that school-scoped work does not start before `requirePrincipal()` resolves and that pilot evidence starts while other independent work is still pending.

## Files

- `src/components/principal/PilotScorecard.tsx` — server-rendered scorecard markup and discriminated-state presentation.
- `src/components/principal/PilotScorecard.test.tsx` — real static-markup coverage for every metric and baseline state.
- `src/app/(app)/principal/page.tsx` — authorized parallel loading and configurable section integration.
- `src/app/(app)/principal/page.test.tsx` — authorization, concurrency, principal/admin layout, and unavailable-model integration coverage.
- `src/lib/view-prefs/registry.ts` — `pilot_evidence` catalog registration after `beacon_signal`.
- `src/lib/view-prefs/resolve.test.ts` — legacy saved-layout insertion coverage.

## Mobile, accessibility, and performance self-review

### Mobile

- The evidence grid is one column by default, becomes two columns at `sm`, and three only at `xl`.
- Header content stacks on phones and aligns side-by-side only when space is available.
- Count groups wrap instead of forcing horizontal overflow.
- Padding and text sizes remain readable without creating a dense dashboard treatment.

### Accessibility

- The scorecard is a labeled `<section>` with a real heading.
- Metrics use a semantic definition list with paired `<dt>` and `<dd>` content.
- The feedback destination is a text link with visible keyboard focus treatment.
- Meaning is conveyed in text, not color; unavailable and small-sample states have explicit wording.
- No icon-only controls, charts, progress bars, or color-dependent status signals were introduced.

### Performance and server/client boundary

- `PilotScorecard.tsx` has no `'use client'`, hooks, effects, database calls, or browser APIs.
- The page passes the server-rendered scorecard through the configurable client boundary as children, so the component adds no interactive client logic.
- Independent server work starts early and awaits together, removing the prior billing/Beacon Signal waterfall before school-summary work.
- The markup uses simple text and CSS grid; there are no charting, animation, or third-party visualization dependencies.

## Scope and concerns

- No Task 7 disclosure, E2E, migration rollout, or deployment work was included.
- No browser screenshot or E2E visual check was run because Task 7 explicitly owns E2E/rollout; mobile and accessibility review here is structural and markup-based.
- No known functional, authorization, accessibility, or performance concern remains from this implementation.

## Independent review

A read-only reviewer inspected the complete working-tree diff against the task brief and approved it with no Critical, Important, or Minor findings. The review specifically confirmed the authorization ordering, parallel server work, principal/admin layouts, legacy layout insertion, server-only component boundary, discriminated unavailable handling, neutral responsive semantics, and test coverage.

## Fix Round 1

### Findings addressed

1. Parent helpfulness now carries an explicit `Last 30 days` qualifier inside its metric card, distinguishing its feedback window from the card header's seven-day activity window.
2. The combined general-suggestion and parent-comment count now uses the factual wording `feedback items` instead of `responses` for both nonzero and zero counts.
3. `Review feedback` now renders outside the count-state conditional, so `/principal/feedback` remains reachable when the combined count is temporarily unavailable.

Singular/plural polish was intentionally not added in this round, per the scoped fix request.

### RED evidence

Test file changed first:

- `src/components/principal/PilotScorecard.test.tsx`

Command:

```text
npm test -- src/components/principal/PilotScorecard.test.tsx
```

Observed before production changes:

```text
Test Files 1 failed (1)
Tests 4 failed | 5 passed (9)
```

The four failures independently demonstrated the three factual/guardrail defects:

```text
renders the ready evidence model with neutral method context
  missing Parent helpfulness -> Last 30 days -> 75% helpful sequence

describes the combined feedback count as feedback items
  missing "5 feedback items"

renders zero feedback as observed data
  missing "0 feedback items"

keeps review access when the feedback count is unavailable
  missing href="/principal/feedback"
```

### GREEN evidence

Minimal component cycle:

```text
npm test -- src/components/principal/PilotScorecard.test.tsx
Test Files 1 passed (1)
Tests 9 passed (9)
```

Requested final focused verification:

```text
npm test -- src/components/principal/PilotScorecard.test.tsx 'src/app/(app)/principal/page.test.tsx'
Test Files 2 passed (2)
Tests 13 passed (13)
```

Static gates:

```text
npm run typecheck
exit 0, no diagnostics

npm run lint
exit 0, no diagnostics
```

### Files changed in Fix Round 1

- `src/components/principal/PilotScorecard.test.tsx`
- `src/components/principal/PilotScorecard.tsx`
- `.superpowers/sdd/2026-08-07-pilot-scorecard-implementation/task-6-report.md`

### Fix Round 1 concerns

No known concern remains within the requested guardrails. Singular/plural wording remains deliberately deferred rather than broadened into this fix.
