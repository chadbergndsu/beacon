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
        'rounded-lg border px-4 py-5 sm:px-5',
        tone === 'primary'
          ? 'border-border/80 bg-muted/40'
          : 'border-dashed border-border/80 bg-transparent',
        className
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
