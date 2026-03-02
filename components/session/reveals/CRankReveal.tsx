'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TypewriterText from '@/components/roast/TypewriterText'
import { playErrorStatic, playErrorBeep } from '@/lib/gradeAudio'

type Phase = 'idle' | 'glitch' | 'terminal' | 'typing-1' | 'typing-2' | 'hold' | 'done'

interface CRankRevealProps {
  active: boolean
  focusPercentage: number
  onComplete: () => void
  onShake: (shaking: boolean) => void
}

export default function CRankReveal({ active, onComplete, onShake }: CRankRevealProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [glitchOffsets, setGlitchOffsets] = useState([0, 0, 0])
  const [flashOn, setFlashOn] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const glitchRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const flashRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (!active) {
      setPhase('idle')
      return
    }

    if (prefersReducedMotion) {
      onComplete()
      return
    }

    let ctx: AudioContext | null = null
    try { ctx = new AudioContext() } catch { /* ok */ }

    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms)
      timersRef.current.push(t)
      return t
    }

    // Phase: glitch (0ms)
    setPhase('glitch')
    onShake(true)
    if (ctx) playErrorStatic(ctx)

    // Glitch interval — randomize RGB strip offsets every 80ms
    glitchRef.current = setInterval(() => {
      setGlitchOffsets([
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      ])
    }, 80)

    // Flash interval — toggle white flash every 200ms
    flashRef.current = setInterval(() => {
      setFlashOn(true)
      setTimeout(() => setFlashOn(false), 50)
    }, 200)

    // Phase: terminal (800ms) — stop glitch
    schedule(() => {
      setPhase('terminal')
      onShake(false)
      if (glitchRef.current) { clearInterval(glitchRef.current); glitchRef.current = null }
      if (flashRef.current) { clearInterval(flashRef.current); flashRef.current = null }
      setFlashOn(false)
    }, 800)

    // Phase: typing-1 (1000ms)
    schedule(() => {
      setPhase('typing-1')
      if (ctx) playErrorBeep(ctx)
    }, 1000)

    // Phase: typing-2 (1700ms) — give enough time for line 1 to type
    schedule(() => {
      setPhase('typing-2')
    }, 1700)

    // Phase: hold (2200ms)
    schedule(() => {
      setPhase('hold')
    }, 2200)

    // Phase: done (2500ms)
    schedule(() => {
      setPhase('done')
      onComplete()
    }, 2500)

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      if (glitchRef.current) clearInterval(glitchRef.current)
      if (flashRef.current) clearInterval(flashRef.current)
      onShake(false)
      try { ctx?.close() } catch { /* ok */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  if (phase === 'idle' || phase === 'done') return null

  const showGlitch = phase === 'glitch'
  const phaseIdx = ['glitch', 'terminal', 'typing-1', 'typing-2', 'hold'].indexOf(phase)
  const showTerminal = phaseIdx >= 1
  const showC = phaseIdx >= 1
  const showLine1 = phaseIdx >= 2
  const showLine2 = phaseIdx >= 3

  return (
    <div className="pointer-events-none fixed inset-0 z-[50]">
      {/* Glitch overlay — RGB strips */}
      <AnimatePresence>
        {showGlitch && (
          <>
            {/* Red strip */}
            <div
              className="fixed inset-0 z-[52]"
              style={{
                backgroundColor: 'rgba(239,68,68,0.08)',
                mixBlendMode: 'screen',
                transform: `translateX(${glitchOffsets[0]}px)`,
              }}
            />
            {/* Green strip */}
            <div
              className="fixed inset-0 z-[52]"
              style={{
                backgroundColor: 'rgba(34,197,94,0.06)',
                mixBlendMode: 'screen',
                transform: `translateX(${glitchOffsets[1]}px)`,
              }}
            />
            {/* Blue strip */}
            <div
              className="fixed inset-0 z-[52]"
              style={{
                backgroundColor: 'rgba(59,130,246,0.06)',
                mixBlendMode: 'screen',
                transform: `translateX(${glitchOffsets[2]}px)`,
              }}
            />
            {/* Scan lines */}
            <div
              className="fixed inset-0 z-[53]"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 4px)',
              }}
            />
            {/* White flash */}
            {flashOn && (
              <div
                className="fixed inset-0 z-[54] bg-white/10"
              />
            )}
          </>
        )}
      </AnimatePresence>

      {/* Terminal overlay */}
      <AnimatePresence>
        {showTerminal && (
          <motion.div
            key="terminal"
            className="fixed inset-0 z-[55]"
            style={{ backgroundColor: '#000' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Red scan lines */}
            <div
              className="absolute inset-0"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 4px)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* C Letter + Terminal Text */}
      <AnimatePresence>
        {showC && (
          <motion.div
            key="c-content"
            className="fixed inset-0 z-[58] flex flex-col items-center justify-center"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* C letter with CRT glow */}
            <motion.p
              className="text-game animate-crt-flicker text-8xl font-bold text-red-400"
              style={{
                textShadow: '0 0 20px rgba(248,113,113,0.8), 0 0 40px rgba(248,113,113,0.4)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              C
            </motion.p>

            {/* Terminal error text */}
            <div className="mt-6 flex flex-col gap-1 font-mono text-xs">
              {showLine1 && (
                <p className="text-red-400/80">
                  <TypewriterText text="> FOCUS_LEVEL: CRITICAL" speed={25} />
                </p>
              )}
              {showLine2 && (
                <p className="text-red-400/60">
                  <TypewriterText text="> SESSION_STATUS: FAILED" speed={25} />
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
