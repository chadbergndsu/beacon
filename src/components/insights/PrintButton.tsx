'use client'

export function PrintButton({ label = 'Print / Save PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="mt-3 print:hidden rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
    >
      {label}
    </button>
  )
}
