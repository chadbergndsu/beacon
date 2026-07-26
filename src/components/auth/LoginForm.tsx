'use client'

import { useActionState } from 'react'
import { login, type AuthState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const initial: AuthState = {}

export function LoginForm({
  nextPath = '/dashboard',
  defaultEmail = '',
  defaultPassword = '',
  submitLabel = 'Sign in',
  variant = 'default',
}: {
  nextPath?: string
  defaultEmail?: string
  defaultPassword?: string
  submitLabel?: string
  variant?: 'default' | 'principal'
}) {
  const [state, formAction, pending] = useActionState(login, initial)
  const isPrincipal = variant === 'principal'

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
          className={cn(
            'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            isPrincipal && 'border-sky-200 bg-sky-50/50 dark:bg-sky-950/20'
          )}
          placeholder="you@school.org"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          defaultValue={defaultPassword}
          className={cn(
            'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            isPrincipal && 'border-sky-200 bg-sky-50/50 dark:bg-sky-950/20'
          )}
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending}
        size="lg"
        variant={isPrincipal ? 'navy' : 'primary'}
        className="w-full"
      >
        {pending ? 'Signing in…' : submitLabel}
      </Button>
    </form>
  )
}
