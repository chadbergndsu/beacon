import { requirePrincipal } from '@/lib/principal'
import { listPilotFeedback } from '@/lib/pilot-feedback/store'
import { PilotFeedbackInbox } from '@/components/pilot/PilotFeedbackInbox'
import { PageHeader } from '@/components/ui/page-header'

export default async function PrincipalFeedbackPage() {
  const { schoolId } = await requirePrincipal()
  const items = await listPilotFeedback(schoolId)

  const newCount = items.filter((i) => i.status === 'new').length

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Pilot channel"
        title="Suggestions & issues"
        description={
          <>
            Read-only window for school leadership: you can see pilot suggestions here, but they are{' '}
            <strong className="text-foreground">emailed to the Beacon product owner</strong> as the
            primary inbox — not to the principal&apos;s email.
            {newCount > 0 ? (
              <>
                {' '}
                Currently <strong className="text-foreground">{newCount} new</strong>.
              </>
            ) : null}
          </>
        }
      />

      <PilotFeedbackInbox initialItems={items} />
    </div>
  )
}
