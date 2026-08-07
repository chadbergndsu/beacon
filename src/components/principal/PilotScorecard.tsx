import Link from 'next/link'
import type {
  BaselineStatus,
  DeliveryMetric,
  HelpfulnessMetric,
  PilotEvidenceScorecard,
  RatioMetric,
  WorkflowMetric,
} from '@/lib/pilot-analytics/types'

function BaselineNote({ baseline }: { baseline: BaselineStatus }) {
  switch (baseline.state) {
    case 'not_started':
      return <>Baseline starts with first pilot activity</>
    case 'gathering':
      return <>Baseline gathering · day {baseline.day} of 28</>
    case 'complete':
      return <>Baseline complete · 28-day method established</>
    case 'unavailable':
      return <>Baseline temporarily unavailable</>
  }
}

function Metric({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/80 bg-muted/20 p-3.5 sm:p-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-sm leading-6 text-foreground">{children}</dd>
    </div>
  )
}

function UnavailableMetric() {
  return <span className="font-medium text-muted-foreground">Temporarily unavailable</span>
}

function RatioValue({
  metric,
  noEligibleMessage,
}: {
  metric: RatioMetric
  noEligibleMessage: string
}) {
  if (metric.state === 'unavailable') return <UnavailableMetric />
  if (metric.state === 'no_eligible') {
    return <span className="text-muted-foreground">{noEligibleMessage}</span>
  }

  return (
    <>
      <span className="font-semibold tabular-nums">
        {metric.active} of {metric.eligible} eligible · {metric.percent}%
      </span>
      {metric.active === 0 ? (
        <span className="mt-1 block text-xs text-muted-foreground">
          No activity recorded in this window
        </span>
      ) : null}
    </>
  )
}

function WorkflowValue({
  metric,
  primaryLabel,
}: {
  metric: WorkflowMetric
  primaryLabel: string
}) {
  if (metric.state === 'unavailable') return <UnavailableMetric />
  if (metric.primary === 0 && metric.secondary === 0) {
    return <span className="text-muted-foreground">No activity recorded in this window</span>
  }

  return (
    <span className="font-semibold tabular-nums">
      {metric.primary} {primaryLabel} · {metric.secondary} records
    </span>
  )
}

function DeliveryValue({ metric }: { metric: DeliveryMetric }) {
  if (metric.state === 'unavailable') return <UnavailableMetric />

  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 font-semibold tabular-nums">
      <span>{metric.delivered} delivered</span>
      <span>{metric.failed} failed</span>
      <span>{metric.unsent} unsent</span>
    </span>
  )
}

function HelpfulnessValue({ metric }: { metric: HelpfulnessMetric }) {
  if (metric.state === 'unavailable') return <UnavailableMetric />
  if (metric.state === 'small_sample') {
    return (
      <span className="text-muted-foreground">
        {metric.total} responses · not enough for a percentage
      </span>
    )
  }

  return (
    <span className="font-semibold tabular-nums">
      {metric.percent}% helpful · {metric.total} responses
    </span>
  )
}

export function PilotScorecard({ scorecard }: { scorecard: PilotEvidenceScorecard }) {
  return (
    <section
      aria-labelledby="pilot-evidence-heading"
      className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-2 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="pilot-evidence-heading" className="text-lg font-semibold tracking-tight">
            Pilot evidence
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Last 7 days</p>
        </div>
        <p className="text-xs leading-5 text-muted-foreground sm:max-w-xs sm:text-right">
          <BaselineNote baseline={scorecard.baseline} />
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Teachers active">
          <RatioValue
            metric={scorecard.activeTeachers}
            noEligibleMessage="No eligible teacher accounts yet"
          />
        </Metric>
        <Metric label="Linked parents active">
          <RatioValue
            metric={scorecard.activeLinkedParents}
            noEligibleMessage="No eligible linked parent accounts yet"
          />
        </Metric>
        <Metric label="Attendance activity">
          <WorkflowValue metric={scorecard.attendanceActivity} primaryLabel="school days" />
        </Metric>
        <Metric label="Grade activity">
          <WorkflowValue metric={scorecard.gradeActivity} primaryLabel="assignments" />
        </Metric>
        <Metric label="Email delivery">
          <DeliveryValue metric={scorecard.emailDelivery} />
        </Metric>
        <Metric label="Parent helpfulness">
          <HelpfulnessValue metric={scorecard.parentHelpfulness} />
        </Metric>
        <Metric label="Feedback received">
          {scorecard.feedbackReceived.state === 'ready' ? (
            <>
              <span className="font-semibold tabular-nums">
                {scorecard.feedbackReceived.count} responses
              </span>
              <Link
                href="/principal/feedback"
                className="mt-1 block w-fit text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Review feedback
              </Link>
            </>
          ) : (
            <UnavailableMetric />
          )}
        </Metric>
      </dl>

      <div className="mt-4 space-y-1 border-t border-border/70 pt-3 text-xs leading-5 text-muted-foreground">
        <p>Activity is deduplicated by person, workflow, and UTC day.</p>
        <p>These are pilot observations, not staff performance scores or outcome claims.</p>
      </div>
    </section>
  )
}
