'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import {
  CheckCircle2,
  Lightbulb,
  Loader2,
  MessageCirclePlus,
  X,
} from 'lucide-react'
import { submitPilotFeedbackAction } from '@/app/actions/pilot-feedback'
import { FEEDBACK_CATEGORY_LABEL, type FeedbackCategory } from '@/lib/pilot-feedback/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const CATEGORIES: FeedbackCategory[] = ['idea', 'issue', 'question', 'other']

export function PilotSuggestionButton({
  userLabel,
}: {
  /** Shown in the form for reassurance, e.g. first name */
  userLabel?: string | null
}) {
  const pathname = usePathname()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory>('idea')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  // Close on escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function openPanel() {
    setError(null)
    setDone(false)
    setOpen(true)
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await submitPilotFeedbackAction({
        category,
        message,
        pagePath: pathname || (typeof window !== 'undefined' ? window.location.pathname : null),
        pageTitle: typeof document !== 'undefined' ? document.title : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDone(true)
      setMessage('')
      setCategory('idea')
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className={cn(
          'print:hidden fixed z-40 flex items-center gap-2 rounded-full',
          'bg-gradient-to-r from-violet-600 to-sky-600 text-white shadow-lg shadow-violet-500/30',
          'hover:from-violet-500 hover:to-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
          'bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]',
          'px-4 py-3 text-sm font-bold'
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MessageCirclePlus className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Suggestion</span>
        <span className="sm:hidden">Idea</span>
      </button>

      {open && (
        <div
          className="print:hidden fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            aria-label="Close suggestion form"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md rounded-t-2xl border border-border bg-card p-5 shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  <Lightbulb className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2
                    id={titleId}
                    className="text-base font-bold text-navy dark:text-sky-50"
                  >
                    Pilot suggestion
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    Spotted a bug or have an idea? Sends straight to the Beacon
                    builder (not the principal)
                    {userLabel ? ` — thanks, ${userLabel}` : ''}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {done ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Got it — thank you!</p>
                    <p className="mt-1 text-xs opacity-90">
                      Sent to the Beacon product owner. Keep the ideas coming.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setDone(false)
                        setOpen(false)
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <Label className="text-xs">What kind?</Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-semibold transition',
                          category === c
                            ? 'border-violet-600 bg-violet-600 text-white'
                            : 'border-border bg-background text-foreground hover:border-violet-300'
                        )}
                      >
                        {FEEDBACK_CATEGORY_LABEL[c]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="pilot-feedback-message" className="text-xs">
                    Your message
                  </Label>
                  <textarea
                    id="pilot-feedback-message"
                    className="mt-1 w-full min-h-[120px] rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                    placeholder="What should we fix or add? Include enough detail that we can reproduce a bug if needed."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={4000}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Page: <code className="rounded bg-muted px-1">{pathname || '/'}</code>
                    {' · '}
                    We attach this automatically so we know where you were.
                  </p>
                </div>

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending || message.trim().length < 5}
                    onClick={submit}
                    className="gap-1.5 bg-violet-600 hover:bg-violet-500"
                  >
                    {pending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <MessageCirclePlus className="h-3.5 w-3.5" />
                    )}
                    Send suggestion
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
