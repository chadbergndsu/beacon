import type { ConferenceBrief } from '@/lib/insights/conference-brief'
import { Badge } from '@/components/ui/badge'
import { PrintButton } from '@/components/insights/PrintButton'

export function ConferenceBriefView({ brief }: { brief: ConferenceBrief }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      <header className="border-b border-border pb-5 print:border-black">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700">
          Beacon · Conference Brief
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy dark:text-sky-50 print:text-black">
          {brief.studentName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground print:text-slate-700">
          {brief.preparedFor}
          {brief.gradeLevel ? ` · Grade ${brief.gradeLevel}` : ''} · Generated{' '}
          {new Date(brief.generatedAt).toLocaleDateString()}
        </p>
        <p className="mt-2 text-xs text-muted-foreground print:hidden">
          Unique to Beacon — one page instead of hunting across portals.
        </p>
        <PrintButton />
      </header>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Academics
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Class</th>
                <th className="px-3 py-2 font-semibold">Grade</th>
                <th className="px-3 py-2 font-semibold">Missing</th>
                <th className="px-3 py-2 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {brief.classes.map((c) => (
                <tr key={c.name} className="border-t border-border">
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{c.name}</p>
                    {c.subject && (
                      <p className="text-xs text-muted-foreground">{c.subject}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {c.overall != null ? (
                      <>
                        <span className="font-semibold">{c.overall.toFixed(0)}%</span>{' '}
                        <Badge variant="sky">{c.letter}</Badge>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{c.missing || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {c.highlights.join(' · ') || c.formula}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Beacon Pulse
          </h2>
          <p className="mt-2 text-sm">
            Latest:{' '}
            <strong>
              {brief.pulseSummary.latestOverall || 'No check-ins yet'}
              {brief.pulseSummary.latestDate ? ` (${brief.pulseSummary.latestDate})` : ''}
            </strong>
          </p>
          {brief.pulseSummary.dimensionTrends.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
              {brief.pulseSummary.dimensionTrends.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          {brief.pulseSummary.careNotes.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase text-amber-700">Care notes</p>
              <ul className="mt-1 space-y-1 text-sm">
                {brief.pulseSummary.careNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-xl border p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Attendance
          </h2>
          <p className="mt-2 text-sm">
            Present <strong>{brief.attendanceSummary.presentDays}</strong> · Absent{' '}
            <strong>{brief.attendanceSummary.absentDays}</strong> · Tardy{' '}
            <strong>{brief.attendanceSummary.tardyDays}</strong>
          </p>
          {brief.attendanceSummary.recentNotes.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
              {brief.attendanceSummary.recentNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <h2 className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            Family wins
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {brief.familyWins.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900 dark:bg-sky-950/20">
          <h2 className="text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300">
            Talking points
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {brief.talkingPoints.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <h2 className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            Next steps
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {brief.nextSteps.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
