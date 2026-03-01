'use client'

import React, { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

export interface WebcamHandle {
  captureFrame(): string | null
}

type Status = 'loading' | 'active' | 'denied' | 'no-camera'

interface WebcamCaptureProps {
  className?: never
}

const WebcamCapture = React.forwardRef<WebcamHandle, WebcamCaptureProps>((_props, ref) => {
  const [status, setStatus] = useState<Status>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setStatus('active')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const name = err instanceof Error ? err.name : ''
        setStatus(
          name === 'NotFoundError' || name === 'DevicesNotFoundError' ? 'no-camera' : 'denied',
        )
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
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        canvas.getContext('2d')?.drawImage(video, 0, 0)
        return canvas.toDataURL('image/jpeg', 0.6).split(',')[1]
      },
    }),
    [status],
  )

  return (
    <div className="relative h-[150px] w-[200px] overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900/40 backdrop-blur-md">
      <canvas ref={canvasRef} className="hidden" />
      <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />

      {/* Non-active overlays */}
      {status !== 'active' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-zinc-900/80">
          {status === 'loading' && (
            <p className="text-xs text-zinc-400">Initializing…</p>
          )}
          {status === 'denied' && (
            <>
              <p className="px-3 text-center text-xs text-zinc-300">Camera access required</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRetryKey((k) => k + 1)}
              >
                Retry
              </Button>
            </>
          )}
          {status === 'no-camera' && (
            <p className="text-xs text-zinc-400">No camera detected</p>
          )}
        </div>
      )}

      {/* LIVE badge */}
      {status === 'active' && (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-game text-[10px] font-bold text-emerald-400">LIVE</span>
        </div>
      )}
    </div>
  )
})

WebcamCapture.displayName = 'WebcamCapture'
export default WebcamCapture
