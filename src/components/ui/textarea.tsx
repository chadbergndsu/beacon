import { cn } from '@/lib/utils'

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[5.5rem] w-full rounded-md border border-border bg-card px-3 py-2 text-base sm:text-sm text-foreground',
        'shadow-sm transition-all duration-150 resize-y',
        'placeholder:text-muted-foreground/70',
        'hover:border-primary/35',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:border-primary/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}
