'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Film, Play, Trash2 } from 'lucide-react'
import { removeSchoolVideo, saveSchoolVideo } from '@/app/actions/videos'
import { youtubeEmbedId } from '@/lib/school-modules/store'
import type { SchoolVideo } from '@/lib/school-modules/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function VideoLibrary({ videos }: { videos: SchoolVideo[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [activeId, setActiveId] = useState(videos.find((v) => v.featured)?.id || videos[0]?.id)

  const active = videos.find((v) => v.id === activeId) || videos[0]
  const embed = active ? youtubeEmbedId(active.url) : null

  return (
    <div className="space-y-6 animate-beacon-in">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
          Principal only
        </p>
        <h2 className="text-xl font-bold text-navy dark:text-sky-50">Video module</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Chapel, staff training, family nights, board briefings — a private leadership video hub
          inside Beacon.
        </p>
      </div>

      {active && (
        <Card className="overflow-hidden border-sky-100 shadow-[var(--shadow-lift)]">
          <div className="aspect-video bg-slate-950">
            {embed ? (
              <iframe
                title={active.title}
                src={`https://www.youtube.com/embed/${embed}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-300">
                <Film className="h-10 w-10 text-sky-400" />
                <p className="font-medium text-white">{active.title}</p>
                <a
                  href={active.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-sky-400 hover:underline"
                >
                  Open video link →
                </a>
              </div>
            )}
          </div>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-lg">{active.title}</h3>
                {active.description && (
                  <p className="text-sm text-muted-foreground mt-1">{active.description}</p>
                )}
              </div>
              <Badge variant="sky">{active.category}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {videos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setActiveId(v.id)}
              className={`rounded-2xl border p-4 text-left transition card-interactive ${
                active?.id === v.id ? 'border-sky-400 bg-sky-50/50 dark:bg-sky-950/30' : 'bg-card'
              }`}
            >
              <div className="flex items-center gap-2 text-sky-600 mb-2">
                <Play className="h-4 w-4" />
                <Badge variant="muted" className="text-[10px]">
                  {v.category}
                </Badge>
                {v.featured && <Badge variant="sky">Featured</Badge>}
              </div>
              <p className="font-semibold text-sm">{v.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.description}</p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 text-red-600 h-8 px-2"
                disabled={pending}
                onClick={(e) => {
                  e.stopPropagation()
                  start(async () => {
                    if (!confirm('Remove this video?')) return
                    await removeSchoolVideo(v.id)
                    router.refresh()
                  })
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-5 space-y-3">
          <h3 className="font-semibold">Add video</h3>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              setError(null)
              setOk(null)
              start(async () => {
                const res = await saveSchoolVideo({
                  title: String(fd.get('title') || ''),
                  description: String(fd.get('description') || ''),
                  url: String(fd.get('url') || ''),
                  category: String(fd.get('category') || 'other') as SchoolVideo['category'],
                  featured: fd.get('featured') === 'on',
                })
                if (!res.ok) setError(res.error)
                else {
                  setOk('Video added to principal library.')
                  e.currentTarget.reset()
                  router.refresh()
                }
              })
            }}
          >
            <div className="sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="Chapel · week of courage" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="url">Video URL (YouTube, Vimeo, or link)</Label>
              <Input
                id="url"
                name="url"
                required
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" placeholder="Optional context" />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                className="flex h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm"
                defaultValue="chapel"
              >
                <option value="chapel">Chapel</option>
                <option value="training">Staff training</option>
                <option value="family">Family / parents</option>
                <option value="board">Board</option>
                <option value="other">Other</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm mt-7">
              <input type="checkbox" name="featured" className="h-4 w-4" />
              Feature on principal overview
            </label>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            {ok && <p className="text-sm text-emerald-700 sm:col-span-2">{ok}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending} size="lg">
                {pending ? 'Saving…' : 'Add to library'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
