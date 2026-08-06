import type { ConferenceBrief } from '@/lib/insights/conference-brief'
import { Badge } from '@/components/ui/badge'
import { PrintButton } from '@/components/insights/PrintButton'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

export function ConferenceBriefView({ brief }: { brief: ConferenceBrief }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      <header className="border-b border-border pb-5 print:border-black">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          Beacon · Conference Brief
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight print:text-black">
          {brief.studentName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground print:text-slate-700">
          {brief.preparedFor}
          {brief.gradeLevel ? ` · Grade ${brief.gradeLevel}` : ''} · Generated{' '}
          {new Date(brief.generatedAt).toLocaleDateString()}
        </p>
        <p className="mt-2 text-xs text-muted-foreground print:hidden">
          One page instead of hunting across portals.
        </p>
        <PrintButton />
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Academics
        </h2>
        <div className="mt-3">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Class</TH>
                <TH>Grade</TH>
                <TH>Missing</TH>
                <TH>Notes</TH>
              </TR>
            </THead>
            <TBody>
              {brief.classes.map((c) => (
                <TR key={c.name}>
                  <TD>
                    <p className="font-medium">{c.name}</p>
                    {c.subject ? (
                      <p className="text-xs text-muted-foreground">{c.subject}</p>
                    ) : null}
                  </TD>
                  <TD className="tabular-nums">
                    {c.overall != null ? (
                      <>
                        <span className="font-semibold">{c.overall.toFixed(0)}%</span>{' '}
                        <Badge variant="default">{c.letter}</Badge>
                      </>
                    ) : (
                      '—'
                    )}
                  </TD>
                  <TD className="tabular-nums">{c.missing || '—'}</TD>
                  <TD className="text-xs text-muted-foreground">
                    {c.highlights.join(' · ') || c.formula}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
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
        <section className="rounded-xl border border-success/25 bg-success-soft/50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-success">
            Family wins
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {brief.familyWins.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-primary">
            Talking points
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {brief.talkingPoints.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-warning/30 bg-warning-soft/50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-warning">
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
