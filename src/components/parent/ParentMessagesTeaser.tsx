import Link from 'next/link'
import { listFamilyThreadForEmail } from '@/lib/email/inbound'
import { kindLabel } from '@/lib/comms/desk'
import { buttonClassName } from '@/components/ui/button'

/**
 * Parent Home teaser — “School wrote you” without dumping the full thread.
 */
export async function ParentMessagesTeaser({
  schoolId,
  parentEmail,
  schoolName,
}: {
  schoolId: string
  parentEmail: string
  schoolName: string
}) {
  const thread = await listFamilyThreadForEmail(schoolId, parentEmail, 8)
  const latest = thread[0]
  const replyCount = thread.filter((t) => t.direction === 'in').length
  const schoolCount = thread.filter((t) => t.direction === 'out').length

  if (!latest) {
    return (
      <div className="rounded-2xl border border-dashed border-border/90 bg-muted/20 px-4 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Notes from school
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          When {schoolName} emails you, the conversation shows up here.
        </p>
        <Link href="/messages" className={`${buttonClassName('ghost', 'sm')} mt-2`}>
          Open messages →
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-beacon-in overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-soft)]">
      <div
        className="border-b border-border/60 px-4 py-3"
        style={{
          background:
            'linear-gradient(90deg, color-mix(in oklab, var(--accent) 10%, transparent), transparent)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            School wrote you
          </p>
          <p className="text-[11px] text-muted-foreground">
            {schoolCount} note{schoolCount === 1 ? '' : 's'}
            {replyCount ? ` · ${replyCount} reply` : ''}
          </p>
        </div>
      </div>
      <div className="px-4 py-3.5">
        <p className="text-[11px] font-medium text-muted-foreground">
          {latest.direction === 'out' ? kindLabel(latest.kind) : 'Your reply'} · latest
        </p>
        <p className="mt-1 font-semibold tracking-tight text-foreground">{latest.subject}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{latest.body_text}</p>
        <Link href="/messages" className={`${buttonClassName('primary', 'sm')} mt-3`}>
          Open conversation
        </Link>
      </div>
    </div>
  )
}
