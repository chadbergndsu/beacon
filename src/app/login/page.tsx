import { LoginForm } from '@/components/auth/LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  const nextPath = params.next && params.next.startsWith('/') ? params.next : '/dashboard'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-sm p-8">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
            Lighthouse Christian Academy
          </p>
          <h1 className="text-2xl font-bold mt-1">Beacon</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to the gradebook</p>
        </div>
        <LoginForm nextPath={nextPath} />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Built under the direction of Chris Cowan ·{' '}
          <a href="/about" className="font-medium text-sky-700 hover:underline">
            About Beacon
          </a>
        </p>
      </div>
    </div>
  )
}
