import Link from 'next/link'
import type { LaunchSuggestion } from '@/lib/ops/next-env-steps'
import { partitionSuggestions } from '@/lib/ops/next-env-steps'
import { cn } from '@/lib/utils'

function Row({ item }: { item: LaunchSuggestion }) {
  const body = (
    <>
      <span
        className={cn(
          'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
          item.done
            ? 'bg-success-soft text-success'
            : 'bg-primary/10 text-primary'
        )}
        aria-hidden
      >
        {item.done ? '✓' : item.optional ? '○' : '!'}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            'block text-sm font-semibold',
            item.done ? 'text-success' : 'text-foreground'
          )}
        >
          {item.label}
          {item.optional && !item.done ? (
            <span className="ml-1.5 text-xs font-medium text-muted-foreground">(optional)</span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {item.detail}
        </span>
      </span>
    </>
  )

  if (item.href && !item.done) {
    return (
      <li>
        <Link
          href={item.href}
          className="flex items-start gap-2.5 rounded-lg px-1 py-1.5 transition hover:bg-muted/70"
        >
          {body}
        </Link>
      </li>
    )
  }

  return <li className="flex items-start gap-2.5 px-1 py-1.5">{body}</li>
}

export function LaunchSuggestions({ items }: { items: LaunchSuggestion[] }) {
  const { open, done } = partitionSuggestions(items)
  const openRequired = open.filter((i) => !i.optional)
  const openOptional = open.filter((i) => i.optional)

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-foreground">Launch suggestions</p>
        <p className="text-xs text-muted-foreground">
          {done.length} done · {open.length} open
          {openRequired.length ? ` (${openRequired.length} required)` : ''}
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Env/server setup plus the human checklist. Done items stay listed so you can see progress.
      </p>

      {openRequired.length > 0 ? (
        <section className="mt-4">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
            Still open
          </h4>
          <ul className="mt-1.5 space-y-0.5">
            {openRequired.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-4 text-sm font-medium text-success">
          Required launch suggestions are complete. Optional items below if you want them.
        </p>
      )}

      {openOptional.length > 0 ? (
        <section className="mt-4">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
            Optional
          </h4>
          <ul className="mt-1.5 space-y-0.5">
            {openOptional.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ) : null}

      {done.length > 0 ? (
        <section className="mt-4 border-t border-border/80 pt-3">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-success">
            Done
          </h4>
          <ul className="mt-1.5 space-y-0.5 opacity-90">
            {done.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <Link href="/admin/emails" className="font-semibold text-primary hover:underline">
          Communications →
        </Link>
        <Link
          href="/principal/payments"
          className="font-semibold text-primary hover:underline"
        >
          QuickBooks →
        </Link>
        <Link
          href="/craft"
          className="font-semibold text-primary hover:underline"
        >
          BeaconCraft →
        </Link>
        <Link href="/school" className="font-semibold text-primary hover:underline">
          Public school site →
        </Link>
      </p>
    </div>
  )
}
