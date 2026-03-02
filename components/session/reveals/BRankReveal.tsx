'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playForgeClank } from '@/lib/gradeAudio'

type Phase = 'idle' | 'darken' | 'strike-1' | 'strike-2' | 'strike-3' | 'cool' | 'subtitle' | 'done'

interface BRankRevealProps {
  active: boolean
  onComplete: () => void
  onShake: (shaking: boolean) => void
}

function makeSparks(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 120,
    y: -(30 + Math.random() * 80),
    size: 1.5 + Math.random() * 1.5,
    duration: 0.3 + Math.random() * 0.2,
    color: ['#fbbf24', '#f59e0b', '#fb923c', '#fcd34d'][Math.floor(Math.random() * 4)],
  }))
}

export default function BRankReveal({ active, onComplete, onShake }: BRankRevealProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const strike1Sparks = useMemo(() => makeSparks(6), [])
  const strike2Sparks = useMemo(() => makeSparks(10), [])
  const strike3Sparks = useMemo(() => makeSparks(15), [])
  const embers = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 60,
    delay: i * 0.1,
    duration: 0.8 + Math.random() * 0.4,
  })), [])

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

    // Phase: darken (0ms)
    setPhase('darken')

    // Phase: strike-1 (500ms)
    schedule(() => {
      setPhase('strike-1')
      if (ctx) playForgeClank(ctx, 1)
      onShake(true)
      schedule(() => onShake(false), 200)
    }, 500)

    // Phase: strike-2 (1000ms)
    schedule(() => {
      setPhase('strike-2')
      if (ctx) playForgeClank(ctx, 2)
      onShake(true)
      schedule(() => onShake(false), 300)
    }, 1000)

    // Phase: strike-3 (1500ms)
    schedule(() => {
      setPhase('strike-3')
      if (ctx) playForgeClank(ctx, 3)
      onShake(true)
      schedule(() => onShake(false), 400)
    }, 1500)

    // Phase: cool (2000ms)
    schedule(() => {
      setPhase('cool')
    }, 2000)

    // Phase: subtitle (2500ms)
    schedule(() => {
      setPhase('subtitle')
    }, 2500)

    // Phase: done (3000ms)
    schedule(() => {
      setPhase('done')
      onComplete()
    }, 3000)

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      onShake(false)
      try { ctx?.close() } catch { /* ok */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  if (phase === 'idle' || phase === 'done') return null

  const phaseIdx = ['darken', 'strike-1', 'strike-2', 'strike-3', 'cool', 'subtitle'].indexOf(phase)
  const showDarken = phaseIdx >= 0
  const showB = phaseIdx >= 1
  const showStrike1Sparks = phase === 'strike-1'
  const showStrike2Sparks = phase === 'strike-2'
  const showStrike3Sparks = phase === 'strike-3'
  const showStrikeFlash = phase === 'strike-1' || phase === 'strike-2' || phase === 'strike-3'
  const showEmbers = phase === 'cool' || phase === 'subtitle'
  const showSubtitle = phase === 'subtitle'

  // B letter properties based on phase
  const bProps = {
    'darken': { blur: 8, opacity: 0, scale: 1.3 },
    'strike-1': { blur: 5, opacity: 0.7, scale: 1.2 },
    'strike-2': { blur: 2, opacity: 0.85, scale: 1.1 },
    'strike-3': { blur: 0, opacity: 1, scale: 1 },
    'cool': { blur: 0, opacity: 1, scale: 1 },
    'subtitle': { blur: 0, opacity: 1, scale: 1 },
  }[phase] ?? { blur: 8, opacity: 0, scale: 1.3 }

  const glowIntensity = phase === 'strike-3' ? 0.8 : phase === 'cool' || phase === 'subtitle' ? 0.3 : 0.5
  const bShadow = `0 0 ${20 + 20 * glowIntensity}px rgba(245,158,11,${glowIntensity})`

  const renderSparks = (sparks: ReturnType<typeof makeSparks>) =>
    sparks.map((s) => (
      <motion.div
        key={s.id}
        className="absolute"
        style={{
          width: s.size,
          height: s.size,
          backgroundColor: s.color,
          boxShadow: `0 0 4px ${s.color}`,
        }}
        initial={{ x: 0, y: 0, opacity: 1 }}
        animate={{ x: s.x, y: s.y, opacity: 0 }}
        transition={{ duration: s.duration, ease: 'easeOut' }}
      />
    ))

  return (
    <div className="pointer-events-none fixed inset-0 z-[50]">
      {/* Dark overlay */}
      <AnimatePresence>
        {showDarken && (
          <motion.div
            key="darken"
            className="fixed inset-0 z-[50]"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* Amber glow */}
      <AnimatePresence>
        {showDarken && (
          <motion.div
            key="amber-glow"
            className="fixed inset-0 z-[51] flex items-center justify-center"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="h-60 w-60 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)',
              }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strike flash */}
      <AnimatePresence>
        {showStrikeFlash && (
          <motion.div
            key={`strike-flash-${phase}`}
            className="fixed inset-0 z-[55] bg-amber-500/15"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      {/* B Letter + Sparks */}
      <AnimatePresence>
        {showB && (
          <motion.div
            key="b-letter-container"
            className="fixed inset-0 z-[58] flex flex-col items-center justify-center"
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            {/* Spark particles per strike */}
            {showStrike1Sparks && renderSparks(strike1Sparks)}
            {showStrike2Sparks && renderSparks(strike2Sparks)}
            {showStrike3Sparks && renderSparks(strike3Sparks)}

            {/* B letter */}
            <motion.p
              className="text-game text-7xl font-bold text-amber-400"
              animate={{
                filter: `blur(${bProps.blur}px)`,
                opacity: bProps.opacity,
                scale: bProps.scale,
              }}
              style={{ textShadow: bShadow }}
              transition={
                phase === 'strike-3'
                  ? { type: 'spring', stiffness: 400, damping: 20 }
                  : { duration: 0.15 }
              }
            >
              B
            </motion.p>

            {/* Rising embers (cool phase) */}
            {showEmbers && embers.map((e) => (
              <motion.div
                key={`ember-${e.id}`}
                className="absolute h-2 w-2 rounded-full bg-amber-400"
                style={{ boxShadow: '0 0 6px rgba(245,158,11,0.6)' }}
                initial={{ x: e.x, y: 0, opacity: 0 }}
                animate={{ x: e.x, y: -100, opacity: [0, 0.7, 0] }}
                transition={{ duration: e.duration, delay: e.delay, ease: 'easeOut' }}
              />
            ))}

            {/* Subtitle */}
            <AnimatePresence>
              {showSubtitle && (
                <motion.p
                  className="text-game mt-6 text-sm uppercase tracking-[0.2em] text-amber-400/60"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  FORGED IN FOCUS
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
