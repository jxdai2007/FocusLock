'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playLevelUpDing } from '@/lib/gradeAudio'

type Phase = 'idle' | 'xp-bar' | 'flash' | 'stamp' | 'subtitle' | 'done'

interface ARankRevealProps {
  active: boolean
  onComplete: () => void
  onShake: (shaking: boolean) => void
}

function makeSparkles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: Math.random() * 360,
    distance: 40 + Math.random() * 60,
    size: 2 + Math.random() * 2,
    duration: 0.3 + Math.random() * 0.2,
  }))
}

export default function ARankReveal({ active, onComplete, onShake }: ARankRevealProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [fillPct, setFillPct] = useState(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const sparkles = useMemo(() => makeSparkles(10), [])

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (!active) {
      setPhase('idle')
      setFillPct(0)
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

    // Phase: xp-bar (0ms) — fill animates via CSS transition
    setPhase('xp-bar')

    // Start fill counter
    const fillStart = Date.now()
    const fillDuration = 1500
    const fillId = setInterval(() => {
      const elapsed = Date.now() - fillStart
      const pct = Math.min(100, Math.round((elapsed / fillDuration) * 100))
      setFillPct(pct)
      if (pct >= 100) clearInterval(fillId)
    }, 16)
    timersRef.current.push(fillId as unknown as ReturnType<typeof setTimeout>)

    // Phase: flash (1500ms)
    schedule(() => {
      setPhase('flash')
      if (ctx) playLevelUpDing(ctx)
    }, 1500)

    // Phase: stamp (1800ms)
    schedule(() => {
      setPhase('stamp')
      onShake(true)
      schedule(() => onShake(false), 300)
    }, 1800)

    // Phase: subtitle (2200ms)
    schedule(() => {
      setPhase('subtitle')
    }, 2200)

    // Phase: done (2500ms)
    schedule(() => {
      setPhase('done')
      onComplete()
    }, 2500)

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      onShake(false)
      try { ctx?.close() } catch { /* ok */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  if (phase === 'idle' || phase === 'done') return null

  const showBar = phase === 'xp-bar' || phase === 'flash'
  const barFading = phase === 'flash'
  const showFlash = phase === 'flash'
  const showStamp = phase === 'stamp' || phase === 'subtitle'
  const showSubtitle = phase === 'subtitle'

  // Green glow intensity scales with fill
  const glowIntensity = fillPct / 100
  const glowShadow = `0 0 ${10 + 20 * glowIntensity}px rgba(34,197,94,${0.1 + 0.3 * glowIntensity})`

  return (
    <div className="pointer-events-none fixed inset-0 z-[50]">
      {/* Green flash */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key="green-flash"
            className="fixed inset-0 z-[55] bg-green-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 0.25 }}
          />
        )}
      </AnimatePresence>

      {/* XP Bar */}
      <AnimatePresence>
        {showBar && (
          <motion.div
            key="xp-bar"
            className="fixed inset-0 z-[50] flex flex-col items-center justify-center"
            animate={{ opacity: barFading ? 0 : 1, scale: barFading ? 1.05 : 1 }}
            transition={{ duration: 0.3 }}
            exit={{ opacity: 0 }}
          >
            {/* Label */}
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-3">
              Focus Level
            </p>

            {/* Bar container */}
            <div
              className="relative h-6 w-[300px] overflow-hidden rounded-full border border-zinc-700 bg-zinc-800"
              style={{ boxShadow: glowShadow }}
            >
              {/* Fill */}
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-600 to-green-400"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
              />

              {/* Tick marks at 25%, 50%, 75% */}
              {[25, 50, 75].map((pct) => (
                <motion.div
                  key={pct}
                  className="absolute top-0 h-full w-0.5 bg-white/40"
                  style={{ left: `${pct}%` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: fillPct >= pct ? [0, 1, 0.3] : 0 }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>

            {/* Percentage counter */}
            <p className="text-game mt-3 text-sm font-bold text-green-400">
              {fillPct}%
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* A Letter Stamp */}
      <AnimatePresence>
        {showStamp && (
          <motion.div
            key="a-stamp"
            className="fixed inset-0 z-[58] flex flex-col items-center justify-center"
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            {/* Shockwave ring */}
            <motion.div
              className="absolute rounded-full border-2 border-green-400"
              initial={{ width: 0, height: 0, opacity: 1 }}
              animate={{ width: 200, height: 200, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Sparkle particles */}
            {sparkles.map((s) => {
              const rad = (s.angle * Math.PI) / 180
              const tx = Math.cos(rad) * s.distance
              const ty = Math.sin(rad) * s.distance
              return (
                <motion.div
                  key={s.id}
                  className="absolute rounded-full bg-green-400"
                  style={{
                    width: s.size,
                    height: s.size,
                    boxShadow: `0 0 4px rgba(34,197,94,0.6)`,
                  }}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{ x: tx, y: ty, opacity: 0 }}
                  transition={{ duration: s.duration, ease: 'easeOut' }}
                />
              )
            })}

            {/* A letter */}
            <motion.p
              className="text-game text-7xl font-bold text-green-400"
              style={{
                textShadow: '0 0 30px rgba(34,197,94,0.5), 0 0 60px rgba(34,197,94,0.2)',
              }}
              initial={{ scale: 2.5, opacity: 0, y: -50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 18 }}
            >
              A
            </motion.p>

            {/* Subtitle */}
            <AnimatePresence>
              {showSubtitle && (
                <motion.p
                  className="text-game mt-4 text-sm uppercase tracking-[0.2em] text-green-400/60"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  LEVEL UP
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
