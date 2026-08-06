import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'navy' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-ring',
  outline:
    'border border-border bg-card text-foreground hover:bg-muted/60 focus-visible:ring-ring',
  ghost: 'text-foreground hover:bg-muted focus-visible:ring-ring',
  navy: 'bg-navy text-navy-foreground hover:bg-navy/90 focus-visible:ring-ring',
  danger: 'bg-danger text-white hover:bg-danger/90 focus-visible:ring-red-400',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-9 px-3.5 text-sm rounded-md',
  lg: 'h-10 px-4 text-sm rounded-md font-medium',
}

/** Shared classes for <Button> and <Link className={buttonClassName(...)}> */
export function buttonClassName(
  variant: Variant = 'primary',
  size: Size = 'md',
  className?: string
) {
  return cn(
    'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-45',
    variants[variant],
    sizes[size],
    className
  )
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
  return <button type={type} className={buttonClassName(variant, size, className)} {...props} />
}
