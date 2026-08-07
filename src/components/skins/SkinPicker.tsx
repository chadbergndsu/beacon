'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Palette } from 'lucide-react'
import { saveSkinAction } from '@/app/actions/skin'
import { SKINS, type SkinId } from '@/lib/skins/catalog'
import { applySkinClient } from '@/components/skins/SkinProvider'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function SkinPicker({
  currentSkin,
  compact = false,
}: {
  currentSkin: SkinId
  compact?: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [selected, setSelected] = useState<SkinId>(currentSkin)
  const [msg, setMsg] = useState<string | null>(null)

  function pick(id: SkinId) {
    setSelected(id)
    applySkinClient(id)
    setMsg(null)
    start(async () => {
      const r = await saveSkinAction(id)
      if (!r.ok) {
        setMsg(r.error)
        return
      }
      setMsg(`Skin: ${SKINS.find((s) => s.id === id)?.label}`)
      router.refresh()
    })
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" /> Skin
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SKINS.map((s) => (
            <button
              key={s.id}
              type="button"
              title={s.label}
              disabled={pending}
              onClick={() => pick(s.id)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md border transition',
                selected === s.id
                  ? 'border-primary ring-1 ring-primary/40'
                  : 'border-border hover:border-primary/40'
              )}
              style={{
                background: `linear-gradient(135deg, ${s.swatches[0]}, ${s.swatches[1]})`,
              }}
              aria-label={s.label}
              aria-pressed={selected === s.id}
            >
              {selected === s.id ? (
                <Check className="h-3.5 w-3.5 text-white drop-shadow" strokeWidth={3} />
              ) : null}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-primary">
          <Palette className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-[13px] font-medium text-foreground">Your Beacon skin</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
            Pick a look you enjoy. Saved to your account and this browser — only you see it.
          </p>
        </div>
      </div>

      {msg ? (
        <p className="rounded-lg border border-success/25 bg-success-soft px-3 py-2 text-sm text-success">
          {msg}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SKINS.map((s) => {
          const on = selected === s.id
          return (
            <button
              key={s.id}
              type="button"
              disabled={pending}
              onClick={() => pick(s.id)}
              aria-pressed={on}
              className={cn(
                'rounded-lg border p-3 text-left transition',
                on
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-muted/40'
              )}
            >
              <div
                className="mb-2 flex h-12 overflow-hidden rounded-md border border-border"
                aria-hidden
              >
                {s.swatches.map((c) => (
                  <span key={c} className="flex-1" style={{ background: c }} />
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium">{s.label}</p>
                {on ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{s.tagline}</p>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {SKINS.map((s) => (
          <Button
            key={s.id}
            type="button"
            size="sm"
            variant={selected === s.id ? 'primary' : 'outline'}
            disabled={pending}
            onClick={() => pick(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>
    </section>
  )
}
