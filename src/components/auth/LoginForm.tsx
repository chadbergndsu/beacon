'use client'

import { useActionState } from 'react'
import { login, type AuthState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const initial: AuthState = {}

export function LoginForm({
  nextPath = '/dashboard',
  defaultEmail = '',
  submitLabel = 'Sign in',
  variant = 'default',
}: {
  nextPath?: string
  defaultEmail?: string
  submitLabel?: string
  variant?: 'default' | 'principal'
}) {
  const [state, formAction, pending] = useActionState(login, initial)
  const isPrincipal = variant === 'principal'

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
          placeholder="you@school.org"
          className={cn(isPrincipal && 'border-sky-300/50 bg-white/95 dark:bg-slate-900')}
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={cn(isPrincipal && 'border-sky-300/50 bg-white/95 dark:bg-slate-900')}
        />
      </div>
      {state?.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
        >
          {state.error}
        </div>
      )}
      <Button
        type="submit"
        disabled={pending}
        size="lg"
        variant={isPrincipal ? 'navy' : 'primary'}
        className="w-full shadow-lg shadow-sky-500/15"
      >
        {pending ? 'Signing in…' : submitLabel}
      </Button>
    </form>
  )
}
