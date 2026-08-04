'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, CameraOff } from 'lucide-react'

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>
}

function hasBarcodeDetector(): boolean {
  if (typeof window === 'undefined') return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Boolean((window as any).BarcodeDetector)
}

/**
 * Optional camera QR using native BarcodeDetector (Chrome/Edge/Android).
 * Falls back gracefully when unsupported — kiosk still has code entry.
 */
export function CameraQrScanner({
  onCode,
  enabled,
}: {
  onCode: (code: string) => void
  enabled: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [on, setOn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supported = hasBarcodeDetector()
  const lastRef = useRef('')
  const lastAt = useRef(0)

  useEffect(() => {
    if (!on || !enabled || !supported) return
    let stream: MediaStream | null = null
    let raf = 0
    let detector: BarcodeDetectorLike | null = null
    let cancelled = false

    async function start() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BD = (window as any).BarcodeDetector
        detector = new BD({ formats: ['qr_code', 'code_128', 'code_39'] })
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        const tick = async () => {
          if (cancelled || !videoRef.current || !detector) return
          try {
            if (videoRef.current.readyState >= 2) {
              const codes = await detector.detect(videoRef.current)
              if (codes[0]?.rawValue) {
                const now = Date.now()
                const v = codes[0].rawValue
                if (v !== lastRef.current || now - lastAt.current > 2500) {
                  lastRef.current = v
                  lastAt.current = now
                  onCode(v)
                }
              }
            }
          } catch {
            // frame skip
          }
          raf = requestAnimationFrame(() => {
            void tick()
          })
        }
        void tick()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Camera unavailable')
        setOn(false)
      }
    }

    void start()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [on, enabled, supported, onCode])

  if (!supported) {
    return (
      <p className="text-center text-[11px] text-slate-500">
        Camera QR not supported on this browser — use USB scanner or type code.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
        onClick={() => {
          setError(null)
          setOn((v) => !v)
        }}
      >
        {on ? (
          <>
            <CameraOff className="mr-1.5 h-4 w-4" /> Stop camera
          </>
        ) : (
          <>
            <Camera className="mr-1.5 h-4 w-4" /> Camera QR scan
          </>
        )}
      </Button>
      {on && (
        <div className="overflow-hidden rounded-xl border border-white/20 bg-black">
          <video ref={videoRef} className="h-48 w-full object-cover" muted playsInline />
        </div>
      )}
      {error && <p className="text-xs text-amber-300">{error}</p>}
    </div>
  )
}
