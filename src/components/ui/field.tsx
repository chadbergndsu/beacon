import { cn } from '@/lib/utils'

/** Vertical stack for label + control + optional hint/error */
export function Field({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn('space-y-1.5', className)}>{children}</div>
}

export function FieldHint({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-muted-foreground', className)} {...props}>{children}</p>
}

export function FieldError({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  if (!children) return null
  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border border-red-200 bg-danger-soft px-3.5 py-2.5 text-sm text-danger',
        className
      )}
    >
      {children}
    </div>
  )
}
