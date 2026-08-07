import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { listFamilyThreadForEmail } from '@/lib/email/inbound'
import { loadSchoolBrand } from '@/lib/school-brand'
import { NoteTimeline } from '@/components/comms/NoteTimeline'
import { buttonClassName } from '@/components/ui/button'

export default async function FamilyMessagesPage() {
  const { profile, user } = await getProfile()
  if (!profile || profile.role !== 'parent') {
    redirect('/dashboard')
  }
  if (!profile.school_id || !user.email) {
    redirect('/dashboard')
  }

  const [thread, brand] = await Promise.all([
    listFamilyThreadForEmail(profile.school_id, user.email, 50),
    loadSchoolBrand(profile.school_id),
  ])

  const school = brand.name || 'your school'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border/80">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(100% 80% at 100% 0%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 55%), linear-gradient(160deg, color-mix(in oklab, var(--navy) 5%, var(--background)), var(--card))',
          }}
          aria-hidden
        />
        <div className="relative animate-beacon-in px-5 py-7 sm:px-7 sm:py-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Notes from school
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {school}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Everything the school emailed you — Dinner Table Digests, reminders, grade notes —
            and your replies. Reply from your email inbox; Beacon keeps the thread.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/dashboard" className={buttonClassName('outline', 'sm')}>
              Family home
            </Link>
            <Link href="/announcements" className={buttonClassName('ghost', 'sm')}>
              News
            </Link>
          </div>
        </div>
      </section>

      <NoteTimeline
        items={thread}
        emptyTitle="Quiet for now"
        emptyDescription={`When ${school} writes home, notes appear here in order. Reply by email to continue the conversation.`}
      />
    </div>
  )
}
