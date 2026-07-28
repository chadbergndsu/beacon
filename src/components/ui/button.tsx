import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'navy' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20 hover:from-sky-400 hover:to-sky-600 focus-visible:ring-ring',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-sky-100 dark:hover:bg-sky-900/40 focus-visible:ring-ring',
  outline:
    'border border-border bg-card/90 text-foreground shadow-sm hover:bg-muted/80 hover:border-sky-300/60 focus-visible:ring-ring',
  ghost: 'text-foreground hover:bg-muted focus-visible:ring-ring',
  navy: 'bg-gradient-to-b from-slate-800 to-navy text-navy-foreground shadow-md hover:from-slate-700 focus-visible:ring-sky-400',
  danger: 'bg-danger text-white hover:bg-red-700 focus-visible:ring-red-400',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-6 text-sm rounded-xl font-semibold',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-45',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}
