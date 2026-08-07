import { cn } from '@/lib/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <div className="text-xs font-medium text-muted-foreground">{eyebrow}</div>
        ) : null}
        <h1 className="text-xl font-medium tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
