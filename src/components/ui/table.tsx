import { cn } from '@/lib/utils'

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-card">
      <table className={cn('w-full min-w-[28rem] text-[13px]', className)} {...props} />
    </div>
  )
}

export function THead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('border-b border-border bg-muted/40 text-left', className)}
      {...props}
    />
  )
}

export function TBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border/60', className)} {...props} />
}

export function TR({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('hover:bg-muted/30', className)} {...props} />
}

export function TH({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap',
        className
      )}
      {...props}
    />
  )
}

export function TD({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-2.5 py-1.5 align-middle', className)} {...props} />
}
