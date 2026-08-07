'use client'

import { useActionState } from 'react'
import { login, type AuthState } from '@/app/actions/auth'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Button } from '@/components/ui/button'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
      <Field>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
          placeholder="you@school.org"
        />
      </Field>
      <Field>
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" name="password" required />
      </Field>
      <FieldError>{state?.error}</FieldError>
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
