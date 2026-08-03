'use client'

/**
 * Browser player for campus cameras.
 * Open-source stack: hls.js (Apache-2.0) for HLS; native video for Safari;
 * <img> for MJPEG; iframe for go2rtc stream.html embeds.
 * https://github.com/video-dev/hls.js · https://github.com/AlexxIT/go2rtc
 */

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Film, RefreshCw } from 'lucide-react'
import type { SchoolCamera } from '@/lib/school-modules/types'
import { CameraSimulator } from '@/components/principal/CameraSimulator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CameraStreamPlayer({
  camera,
  className,
  autoPlay = true,
}: {
  camera: SchoolCamera
  className?: string
  autoPlay?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    setError(null)
    if (camera.streamKind !== 'hls') return

    const video = videoRef.current
    if (!video) return

    const src = camera.streamUrl
    let hls: Hls | null = null

    // Safari / iOS: native HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      if (autoPlay) {
        video.play().catch(() => {
          /* autoplay may require muted — we set muted */
        })
      }
      return () => {
        video.removeAttribute('src')
        video.load()
      }
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      })
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setError(
            data.type === Hls.ErrorTypes.NETWORK_ERROR
              ? 'Network error — is go2rtc / NVR reachable from this browser?'
              : 'Stream error — check the camera URL and stream type.'
          )
          hls?.destroy()
        }
      })
      if (autoPlay) {
        video.play().catch(() => {})
      }
      return () => {
        hls?.destroy()
      }
    }

    setError('This browser cannot play HLS. Use Chrome, Safari, or Firefox.')
    return undefined
  }, [camera.streamUrl, camera.streamKind, autoPlay, retry])

  if (camera.streamKind === 'simulator') {
    return <CameraSimulator camera={camera} className={className} />
  }

  if (camera.streamKind === 'iframe') {
    return (
      <div className={cn('relative aspect-video bg-slate-950', className)}>
        <iframe
          title={camera.name}
          src={camera.streamUrl}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; encrypted-media"
          referrerPolicy="no-referrer"
        />
      </div>
    )
  }

  if (camera.streamKind === 'mjpeg' || camera.streamKind === 'snapshot') {
    return (
      <div className={cn('relative aspect-video bg-slate-950', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={`${camera.id}-${retry}`}
          src={camera.streamUrl}
          alt={camera.name}
          className="h-full w-full object-contain"
          onError={() =>
            setError(
              camera.streamKind === 'mjpeg'
                ? 'MJPEG failed — check camera or go2rtc mjpeg URL.'
                : 'Snapshot failed to load.'
            )
          }
        />
        {error && <StreamError message={error} onRetry={() => setRetry((n) => n + 1)} />}
      </div>
    )
  }

  // HLS (default)
  return (
    <div className={cn('relative aspect-video bg-slate-950', className)}>
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        muted
        playsInline
        controls
        autoPlay={autoPlay}
        poster={camera.snapshotUrl || undefined}
      />
      {error && <StreamError message={error} onRetry={() => setRetry((n) => n + 1)} />}
      {!error && !camera.streamUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Film className="h-8 w-8" />
          <p className="text-sm">No stream URL</p>
        </div>
      )}
    </div>
  )
}

function StreamError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 p-4 text-center">
      <p className="max-w-sm text-sm text-red-200">{message}</p>
      <Button size="sm" variant="outline" className="border-white/20 text-white" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  )
}
