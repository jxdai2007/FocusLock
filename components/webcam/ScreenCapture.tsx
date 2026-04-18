'use client'

import React, { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

export interface ScreenHandle {
  captureFrame(): string | null
}

type Status = 'idle' | 'requesting' | 'active' | 'denied' | 'ended'

interface ScreenCaptureProps {
  className?: never
}

const ScreenCapture = React.forwardRef<ScreenHandle, ScreenCaptureProps>((_props, ref) => {
  const [status, setStatus] = useState<Status>('idle')
  const [retryKey, setRetryKey] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('requesting')

    const getDisplayMedia = (navigator.mediaDevices as unknown as {
      getDisplayMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>
    }).getDisplayMedia

    if (!getDisplayMedia) {
      setStatus('denied')
      return
    }

    getDisplayMedia.call(navigator.mediaDevices, { video: { frameRate: 2 } as MediaTrackConstraints, audio: false })
      .then((stream: MediaStream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => { /* play rejection ok */ })
        }
        setStatus('active')
        stream.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (cancelled) return
          setStatus('ended')
        })
      })
      .catch(() => {
        if (cancelled) return
        setStatus('denied')
      })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [retryKey])

  useImperativeHandle(
    ref,
    () => ({
      captureFrame(): string | null {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || status !== 'active') return null
        const w = video.videoWidth || 1280
        const h = video.videoHeight || 720
        canvas.width = Math.min(w, 960)
        canvas.height = Math.round(canvas.width * (h / w))
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/jpeg', 0.55).split(',')[1]
      },
    }),
    [status],
  )

  if (status === 'active') {
    return (
      <div className="relative h-[110px] w-[160px] overflow-hidden rounded-xl border border-blue-700/50 bg-zinc-900/40 backdrop-blur-md">
        <canvas ref={canvasRef} className="hidden" />
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
          </span>
          <span className="text-game text-[10px] font-bold text-sky-400">SCREEN</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[110px] w-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-zinc-700/50 bg-zinc-900/40 backdrop-blur-md">
      <canvas ref={canvasRef} className="hidden" />
      <video ref={videoRef} muted playsInline className="hidden" />
      {status === 'requesting' && <p className="text-[10px] text-zinc-400">Requesting...</p>}
      {status === 'denied' && (
        <>
          <p className="px-3 text-center text-[10px] text-zinc-400">Screen share denied</p>
          <Button size="sm" variant="outline" onClick={() => setRetryKey((k) => k + 1)}>
            Retry
          </Button>
        </>
      )}
      {status === 'ended' && (
        <>
          <p className="px-3 text-center text-[10px] text-zinc-400">Screen share ended</p>
          <Button size="sm" variant="outline" onClick={() => setRetryKey((k) => k + 1)}>
            Restart
          </Button>
        </>
      )}
      {status === 'idle' && <p className="text-[10px] text-zinc-500">Screen share off</p>}
    </div>
  )
})

ScreenCapture.displayName = 'ScreenCapture'
export default ScreenCapture
