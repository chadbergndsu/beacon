import { cn } from '@/lib/utils'

type Variant = 'default' | 'sky' | 'navy' | 'success' | 'warning' | 'danger' | 'muted' | 'outline'

const styles: Record<Variant, string> = {
  default: 'bg-primary/10 text-primary border-primary/15',
  sky: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800',
  navy: 'bg-navy text-navy-foreground border-transparent',
  success: 'bg-success-soft text-success border-emerald-200/80 dark:border-emerald-800',
  warning: 'bg-warning-soft text-warning border-amber-200/80 dark:border-amber-800',
  danger: 'bg-danger-soft text-danger border-red-200/80 dark:border-red-800',
  muted: 'bg-muted text-muted-foreground border-transparent',
  outline: 'bg-transparent text-foreground border-border',
}

export function Badge({
  children,
  className,
  variant = 'default',
}: {
  children: React.ReactNode
  className?: string
  variant?: Variant
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
