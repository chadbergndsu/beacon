export default function AppLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6" aria-label="Loading view">
      <span className="sr-only">Loading your next view…</span>
      <div className="h-8 w-52 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  )
}
