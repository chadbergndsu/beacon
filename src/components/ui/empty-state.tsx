import { cn } from '@/lib/utils'

export function EmptyState({
  title,
  description,
  action,
  className,
  tone = 'default',
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  tone?: 'default' | 'primary'
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-5 py-8 text-center sm:px-8',
        tone === 'primary'
          ? 'border-primary/20 bg-primary/5'
          : 'border-border/80 bg-card/80',
        className
      )}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
