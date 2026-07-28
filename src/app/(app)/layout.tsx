import { AppHeader } from '@/components/layout/AppHeader'
import { getProfile } from '@/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getProfile()

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden beacon-shell">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-8">
        <div className="animate-beacon-in min-w-0">{children}</div>
      </main>
      <footer className="border-t border-border/70 bg-card/50 px-3 py-4 pb-safe text-center text-xs text-muted-foreground">
        Beacon school suite · Lighthouse Christian Academy ·{' '}
        <a
          href="https://lcadawsonville.com"
          className="text-sky-700 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          lcadawsonville.com
        </a>
      </footer>
    </div>
  )
}
