import Link from 'next/link'
import { format } from 'date-fns'
import { redirect } from 'next/navigation'
import { SystemEmailForm } from '@/components/announcements/SystemEmailForm'
import { getProfile } from '@/lib/auth'
import { listEmailOutbox } from '@/lib/email/send'

export default async function EmailOutboxPage() {
  const { profile } = await getProfile()
  if (!profile || !['admin', 'staff', 'teacher', 'principal'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const emails = await listEmailOutbox(profile.school_id, 100)
  const canManual =
    profile.role === 'admin' || profile.role === 'staff' || profile.role === 'principal'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System email outbox</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every announcement/system email is recorded here. Delivery uses{' '}
          <code className="text-xs bg-muted px-1 rounded">RESEND_API_KEY</code> when set; otherwise
          messages are logged as <strong>skipped</strong> (safe dry-run — no accidental parent spam).
        </p>
      </div>

      <div
        className={
          process.env.RESEND_API_KEY
            ? 'rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 p-4 text-sm'
            : 'rounded-xl border border-amber-200 bg-amber-50 text-amber-950 p-4 text-sm'
        }
      >
        <p className="font-semibold">
          Mode:{' '}
          {process.env.RESEND_API_KEY ? 'Live delivery (Resend)' : 'Log-only (not delivered)'}
        </p>
        <ol className="list-decimal ml-5 space-y-1 mt-2">
          <li>
            Create an account at{' '}
            <a className="underline" href="https://resend.com" target="_blank" rel="noreferrer">
              resend.com
            </a>{' '}
            and verify your school domain
          </li>
          <li>
            Set on Vercel / <code className="text-xs">.env.local</code>:{' '}
            <code className="text-xs">RESEND_API_KEY=re_...</code>
          </li>
          <li>
            Set <code className="text-xs">EMAIL_FROM=Beacon &lt;office@yourschool.org&gt;</code>
          </li>
          <li>
            Confirm on <a className="underline font-medium" href="/principal/release">Go-live</a>
          </li>
        </ol>
      </div>

      {canManual && (
        <div className="rounded-xl border bg-background p-4">
          <SystemEmailForm />
        </div>
      )}

      <section>
        <h2 className="font-semibold mb-3">Recent messages ({emails.length})</h2>
        {emails.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border p-4">
            No emails yet. Publish an announcement with “Email recipients” checked, or send a system
            email above.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">To</th>
                  <th className="px-3 py-2 font-medium">Subject</th>
                  <th className="px-3 py-2 font-medium">Kind</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {e.created_at
                        ? format(new Date(e.created_at), 'MMM d · h:mm a')
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{e.to_email}</div>
                      {e.to_name && (
                        <div className="text-xs text-muted-foreground">{e.to_name}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-[220px]">
                      <div className="truncate" title={e.subject}>
                        {e.subject}
                      </div>
                      {e.related_id && e.related_table === 'announcements' && (
                        <Link
                          href={`/announcements/${e.related_id}`}
                          className="text-xs text-sky-700 hover:underline"
                        >
                          View announcement
                        </Link>
                      )}
                      {e.error && (
                        <div className="text-xs text-amber-700 mt-1">{e.error}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{e.kind}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          e.status === 'sent'
                            ? 'text-emerald-700 font-medium'
                            : e.status === 'failed'
                              ? 'text-red-700 font-medium'
                              : 'text-amber-700 font-medium'
                        }
                      >
                        {e.status}
                      </span>
                      {e.provider && (
                        <div className="text-[11px] text-muted-foreground">{e.provider}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
