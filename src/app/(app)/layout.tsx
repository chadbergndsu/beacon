import { AppHeader } from '@/components/layout/AppHeader'
import { getProfile } from '@/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getProfile()

  return (
    <div className="min-h-screen flex flex-col beacon-shell">
      <AppHeader profile={profile} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
