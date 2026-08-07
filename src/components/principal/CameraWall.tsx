'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera,
  Grid2x2,
  LayoutGrid,
  Maximize2,
  Plus,
  Trash2,
  Video,
} from 'lucide-react'
import {
  removeSchoolCamera,
  saveSchoolCamera,
  seedDemoCameras,
} from '@/app/actions/cameras'
import { CameraStreamPlayer } from '@/components/principal/CameraStreamPlayer'
import type { CameraStreamKind, SchoolCamera } from '@/lib/school-modules/types'
import { CAMERA_ZONE_LABEL } from '@/lib/school-modules/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const ZONES: SchoolCamera['zone'][] = [
  'entrance',
  'hallway',
  'playground',
  'parking',
  'gym',
  'office',
  'other',
]

const KINDS: { value: CameraStreamKind | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'hls', label: 'HLS (.m3u8) — go2rtc / MediaMTX' },
  { value: 'iframe', label: 'go2rtc embed page' },
  { value: 'mjpeg', label: 'MJPEG' },
  { value: 'snapshot', label: 'Still snapshot (JPG)' },
  { value: 'simulator', label: 'Simulator (EasyCamera demo)' },
]

export function CameraWall({ cameras: initial }: { cameras: SchoolCamera[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(
    initial.find((c) => c.enabled)?.id || initial[0]?.id || null
  )
  const [showForm, setShowForm] = useState(initial.length === 0)
  const [zoneFilter, setZoneFilter] = useState<SchoolCamera['zone'] | 'all'>('all')
  const [layout, setLayout] = useState<'grid' | 'focus'>('grid')

  const cameras = useMemo(() => {
    return initial
      .filter((c) => c.enabled)
      .filter((c) => zoneFilter === 'all' || c.zone === zoneFilter)
  }, [initial, zoneFilter])

  const focus = cameras.find((c) => c.id === focusId) || cameras[0]

  return (
    <div className="space-y-6 animate-beacon-in">
      <PageHeader
        eyebrow="Principal · campus security"
        title={
          <span className="inline-flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Cameras
          </span>
        }
        description={
          <>
            Live wall of school cameras — same idea as your{' '}
            <strong className="text-foreground">EasyCamera LiveGrid</strong>: pick a cam, open a
            session. Production streams use open-source{' '}
            <strong className="text-foreground">go2rtc</strong> /{' '}
            <strong className="text-foreground">MediaMTX</strong> +{' '}
            <strong className="text-foreground">hls.js</strong>.
          </>
        }
        actions={
          <>
            <Button
              size="sm"
              variant={layout === 'grid' ? 'primary' : 'outline'}
              onClick={() => setLayout('grid')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Wall
            </Button>
            <Button
              size="sm"
              variant={layout === 'focus' ? 'primary' : 'outline'}
              onClick={() => setLayout('focus')}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Focus
            </Button>
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-3.5 w-3.5" />
              {showForm ? 'Hide form' : 'Add camera'}
            </Button>
            {initial.length === 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  start(async () => {
                    const res = await seedDemoCameras()
                    if (!res.ok) {
                      setError(res.error)
                      return
                    }
                    setOk(`Loaded ${res.count} simulator cameras (EasyCamera pattern).`)
                    router.refresh()
                  })
                }}
              >
                Seed demo wall
              </Button>
            )}
          </>
        }
      />

      {/* Setup callout — EasyCamera + go2rtc / MediaMTX */}
      <Card className="border-border bg-muted/30">
        <CardContent className="pt-5 text-sm text-muted-foreground space-y-2 leading-relaxed">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Open-source stack (from EasyCamera + go2rtc)
          </p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>
              Site gateway:{' '}
              <a
                className="font-medium text-primary underline"
                href="https://github.com/AlexxIT/go2rtc"
                target="_blank"
                rel="noreferrer"
              >
                go2rtc
              </a>{' '}
              or{' '}
              <a
                className="font-medium text-primary underline"
                href="https://github.com/bluenviron/mediamtx"
                target="_blank"
                rel="noreferrer"
              >
                MediaMTX
              </a>{' '}
              (EasyCamera media-engine uses MediaMTX).
            </li>
            <li>
              HLS URL examples:{' '}
              <code className="text-xs bg-muted px-1 rounded">
                …/api/stream.m3u8?src=front
              </code>{' '}
              (go2rtc) ·{' '}
              <code className="text-xs bg-muted px-1 rounded">…/front/index.m3u8</code> (MediaMTX)
            </li>
            <li>
              No hardware yet? <strong className="text-foreground">Seed demo wall</strong> uses the
              EasyCamera canvas simulator so leadership can tour the UI.
            </li>
          </ol>
          <p className="text-xs">
            Never put raw RTSP in the browser. Never expose go2rtc/MediaMTX to the public internet
            without auth / tunnel.
          </p>
        </CardContent>
      </Card>

      {/* Zone filter */}
      {initial.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setZoneFilter('all')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold',
              zoneFilter === 'all'
                ? 'border-navy bg-navy text-white'
                : 'border-border bg-card hover:border-primary/30'
            )}
          >
            All ({initial.filter((c) => c.enabled).length})
          </button>
          {ZONES.map((z) => {
            const n = initial.filter((c) => c.enabled && c.zone === z).length
            if (!n) return null
            return (
              <button
                key={z}
                type="button"
                onClick={() => setZoneFilter(z)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold',
                  zoneFilter === z
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-primary/30'
                )}
              >
                {CAMERA_ZONE_LABEL[z]} ({n})
              </button>
            )
          })}
        </div>
      )}

      {/* Focus layout */}
      {layout === 'focus' && focus && (
        <Card className="overflow-hidden border-slate-800 shadow-[var(--shadow-lift)]">
          <CameraStreamPlayer camera={focus} />
          <CardContent className="flex flex-wrap items-start justify-between gap-2 py-4">
            <div>
              <h3 className="text-lg font-bold">{focus.name}</h3>
              <p className="text-sm text-muted-foreground">
                {focus.location} · {CAMERA_ZONE_LABEL[focus.zone]} · {focus.streamKind}
              </p>
            </div>
            <Badge variant="sky">{focus.streamKind.toUpperCase()}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Wall grid */}
      {cameras.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <Grid2x2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium text-foreground">No cameras yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first go2rtc / HLS stream to build the wall.
          </p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Add camera
          </Button>
        </Card>
      ) : (
        <div
          className={cn(
            'grid gap-3',
            layout === 'grid'
              ? 'sm:grid-cols-2 xl:grid-cols-3'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          )}
        >
          {cameras.map((cam) => (
            <Card
              key={cam.id}
              className={cn(
                'overflow-hidden transition',
                focus?.id === cam.id && layout === 'focus' && 'ring-2 ring-primary/40'
              )}
            >
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => {
                  setFocusId(cam.id)
                  setLayout('focus')
                }}
              >
                <CameraStreamPlayer
                  camera={cam}
                  autoPlay={layout === 'grid' ? false : focus?.id === cam.id}
                  className={layout === 'focus' ? 'aspect-video' : 'aspect-video max-h-48'}
                />
              </button>
              <CardContent className="flex items-start justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-sm">{cam.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {cam.location} · {CAMERA_ZONE_LABEL[cam.zone]}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-red-600"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Remove camera “${cam.name}”? Streams are not deleted on the NVR.`))
                      return
                    start(async () => {
                      const res = await removeSchoolCamera(cam.id)
                      if (!res.ok) {
                        setError(res.error)
                        return
                      }
                      setOk('Camera removed from Beacon.')
                      router.refresh()
                    })
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Disabled cameras list */}
      {initial.some((c) => !c.enabled) && (
        <p className="text-xs text-muted-foreground">
          {initial.filter((c) => !c.enabled).length} disabled camera(s) hidden from the wall.
        </p>
      )}

      {showForm && (
        <Card>
          <div className="border-b border-border bg-muted/30 px-5 py-3">
            <h3 className="font-semibold">Add / update camera</h3>
          </div>
          <CardContent className="pt-5">
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                setError(null)
                setOk(null)
                start(async () => {
                  const res = await saveSchoolCamera({
                    name: String(fd.get('name') || ''),
                    location: String(fd.get('location') || ''),
                    zone: String(fd.get('zone') || 'other') as SchoolCamera['zone'],
                    streamUrl: String(fd.get('streamUrl') || ''),
                    streamKind: String(fd.get('streamKind') || 'auto') as
                      | CameraStreamKind
                      | 'auto',
                    snapshotUrl: String(fd.get('snapshotUrl') || '') || undefined,
                    notes: String(fd.get('notes') || '') || undefined,
                    enabled: fd.get('enabled') === 'on',
                  })
                  if (!res.ok) {
                    setError(res.error)
                    return
                  }
                  setOk('Camera saved.')
                  setShowForm(false)
                  setFocusId(res.id)
                  router.refresh()
                })
              }}
            >
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="Front entrance" />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" placeholder="Main doors · north" />
              </div>
              <div>
                <Label htmlFor="zone">Zone</Label>
                <select
                  id="zone"
                  name="zone"
                  className="flex h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm"
                  defaultValue="entrance"
                >
                  {ZONES.map((z) => (
                    <option key={z} value={z}>
                      {CAMERA_ZONE_LABEL[z]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="streamKind">Stream type</Label>
                <select
                  id="streamKind"
                  name="streamKind"
                  className="flex h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm"
                  defaultValue="auto"
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="streamUrl">Stream URL (browser-safe)</Label>
                <Input
                  id="streamUrl"
                  name="streamUrl"
                  required
                  placeholder="https://go2rtc:1984/api/stream.m3u8?src=front  or  simulator"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="snapshotUrl">Snapshot URL (optional)</Label>
                <Input
                  id="snapshotUrl"
                  name="snapshotUrl"
                  placeholder="https://go2rtc.local:1984/api/frame.jpeg?src=front"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" placeholder="POE cam · NVR channel 3" />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="enabled" defaultChecked className="rounded" />
                Enabled on wall
              </label>
              {error && (
                <p className="text-sm text-red-600 sm:col-span-2" role="alert">
                  {error}
                </p>
              )}
              {ok && <p className="text-sm text-emerald-700 sm:col-span-2">{ok}</p>}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={pending}>
                  {pending ? 'Saving…' : 'Save camera'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
