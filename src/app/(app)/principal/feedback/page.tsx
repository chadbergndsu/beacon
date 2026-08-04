import { requirePrincipal } from '@/lib/principal'
import { listPilotFeedback } from '@/lib/pilot-feedback/store'
import { PilotFeedbackInbox } from '@/components/pilot/PilotFeedbackInbox'

export default async function PrincipalFeedbackPage() {
  const { schoolId } = await requirePrincipal()
  const items = await listPilotFeedback(schoolId)

  const newCount = items.filter((i) => i.status === 'new').length

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
          Pilot channel
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy dark:text-sky-50">
          Suggestions &amp; issues
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Everything people send with the floating <strong>Suggestion</strong> button during the
          pilot lands here
          {newCount > 0 ? (
            <>
              {' '}
              — <strong className="text-foreground">{newCount} new</strong>
            </>
          ) : null}
          . Mark items as you triage so nothing is lost.
        </p>
      </div>

      <PilotFeedbackInbox initialItems={items} />
    </div>
  )
}
