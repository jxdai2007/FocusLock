'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playSRankRumble, playSRankImpact, playSRankEmerge } from '@/lib/sRankAudio'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = 'idle' | 'meteor' | 'impact' | 'emerge' | 'heal' | 'transition' | 'done'

interface SRankRevealProps {
  active: boolean
  onComplete: () => void
  onShake: (shaking: boolean) => void
}

// ---------------------------------------------------------------------------
// Random data generators (stable via useMemo)
// ---------------------------------------------------------------------------

function makeTrailDots(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    opacity: 1 - i * 0.15,
    scale: 1 - i * 0.12,
    delay: i * 0.04,
  }))
}

function makeCracks(count: number) {
  const angles: number[] = []
  for (let i = 0; i < count; i++) {
    angles.push((360 / count) * i + (Math.random() * 20 - 10))
  }
  return angles.map((angle, i) => ({
    id: i,
    angle,
    length: 80 + Math.random() * 120,
    width: 1.5 + Math.random() * 1.5,
  }))
}

function makeDebris(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: Math.random() * 360,
    distance: 100 + Math.random() * 200,
    size: 2 + Math.random() * 4,
    duration: 0.4 + Math.random() * 0.3,
    color: ['#fbbf24', '#f59e0b', '#ef4444', '#f97316', '#fcd34d'][Math.floor(Math.random() * 5)],
  }))
}

function makeEmbers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 60,
    delay: i * 0.08,
    duration: 0.8 + Math.random() * 0.4,
  }))
}

// ---------------------------------------------------------------------------
// SRankReveal
// ---------------------------------------------------------------------------

export default function SRankReveal({ active, onComplete, onShake }: SRankRevealProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const stopRumbleRef = useRef<(() => void) | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const trail = useMemo(() => makeTrailDots(6), [])
  const cracks = useMemo(() => makeCracks(7), [])
  const debris = useMemo(() => makeDebris(18), [])
  const embers = useMemo(() => makeEmbers(6), [])

  // Reduced-motion check
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (!active) {
      setPhase('idle')
      return
    }

    // Skip animation for reduced motion
    if (prefersReducedMotion) {
      onComplete()
      return
    }

    // Create audio context
    try {
      audioCtxRef.current = new AudioContext()
    } catch {
      // Audio not available
    }

    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms)
      timersRef.current.push(t)
      return t
    }

    // Phase: meteor (0ms)
    setPhase('meteor')
    onShake(true)
    if (audioCtxRef.current) {
      stopRumbleRef.current = playSRankRumble(audioCtxRef.current)
    }

    // Phase: impact (800ms)
    schedule(() => {
      setPhase('impact')
      onShake(false)
      if (stopRumbleRef.current) {
        stopRumbleRef.current()
        stopRumbleRef.current = null
      }
      if (audioCtxRef.current) {
        playSRankImpact(audioCtxRef.current)
      }
    }, 800)

    // Phase: emerge (1200ms)
    schedule(() => {
      setPhase('emerge')
      if (audioCtxRef.current) {
        playSRankEmerge(audioCtxRef.current)
      }
    }, 1200)

    // Phase: heal (2000ms)
    schedule(() => {
      setPhase('heal')
    }, 2000)

    // Phase: transition (2500ms)
    schedule(() => {
      setPhase('transition')
    }, 2500)

    // Phase: done (3000ms)
    schedule(() => {
      setPhase('done')
      onComplete()
    }, 3000)

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      if (stopRumbleRef.current) {
        stopRumbleRef.current()
        stopRumbleRef.current = null
      }
      try {
        audioCtxRef.current?.close()
      } catch {
        // already closed
      }
      audioCtxRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  if (phase === 'idle' || phase === 'done') return null

  const showMeteor = phase === 'meteor'
  const showFlash = phase === 'impact'
  const showCracks = phase === 'impact' || phase === 'emerge' || phase === 'heal'
  const showDebris = phase === 'impact' || phase === 'emerge'
  const showS = phase === 'emerge' || phase === 'heal' || phase === 'transition'
  const showEmbers = phase === 'heal' || phase === 'transition'
  const healingCracks = phase === 'heal' || phase === 'transition'
  const sTransitioning = phase === 'transition'

  return (
    <div className="pointer-events-none fixed inset-0 z-[50]">
      {/* ── White flash ── */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key="flash"
            className="fixed inset-0 z-[55] bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* ── Meteor ── */}
      <AnimatePresence>
        {showMeteor && (
          <motion.div
            key="meteor-group"
            className="fixed inset-0 z-[50]"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            {/* Meteor head */}
            <motion.div
              className="absolute h-4 w-4 rounded-full bg-yellow-400"
              style={{
                boxShadow: '0 0 20px 8px rgba(251,191,36,0.6), 0 0 60px 20px rgba(245,158,11,0.3)',
              }}
              initial={{ top: '10%', right: '10%' }}
              animate={{ top: '50%', left: '50%', right: 'auto', marginTop: -8, marginLeft: -8 }}
              transition={{ duration: 0.8, ease: [0.2, 0, 0.3, 1] }}
            />
            {/* Trail dots */}
            {trail.map((dot) => (
              <motion.div
                key={dot.id}
                className="absolute h-2 w-2 rounded-full bg-orange-400"
                style={{ opacity: dot.opacity * 0.6 }}
                initial={{
                  top: `${10 - dot.id * 1.5}%`,
                  right: `${10 - dot.id * 1.5}%`,
                  scale: dot.scale,
                }}
                animate={{
                  top: '50%',
                  left: '50%',
                  right: 'auto',
                  marginTop: -4,
                  marginLeft: -4,
                  scale: dot.scale,
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.2, 0, 0.3, 1],
                  delay: dot.delay,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Debris particles ── */}
      <AnimatePresence>
        {showDebris && (
          <motion.div
            key="debris"
            className="fixed inset-0 z-[58]"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {debris.map((d) => {
              const rad = (d.angle * Math.PI) / 180
              const tx = Math.cos(rad) * d.distance
              const ty = Math.sin(rad) * d.distance
              return (
                <motion.div
                  key={d.id}
                  className="absolute rounded-full"
                  style={{
                    width: d.size,
                    height: d.size,
                    backgroundColor: d.color,
                    left: '50%',
                    top: '50%',
                    marginLeft: -d.size / 2,
                    marginTop: -d.size / 2,
                    boxShadow: `0 0 6px ${d.color}`,
                  }}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{ x: tx, y: ty, opacity: 0 }}
                  transition={{ duration: d.duration, ease: 'easeOut' }}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cracks ── */}
      <AnimatePresence>
        {showCracks && (
          <motion.div
            key="cracks"
            className="fixed inset-0 z-[60] flex items-center justify-center"
            animate={{ opacity: healingCracks ? 0 : 1 }}
            transition={{ duration: 0.5 }}
            exit={{ opacity: 0 }}
          >
            {cracks.map((c) => (
              <motion.div
                key={c.id}
                className="absolute bg-white/80"
                style={{
                  width: c.length,
                  height: c.width,
                  transformOrigin: 'left center',
                  transform: `rotate(${c.angle}deg)`,
                  boxShadow: '0 0 8px rgba(255,255,255,0.4)',
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.15, ease: 'easeOut', delay: Math.random() * 0.05 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── S Letter ── */}
      <AnimatePresence>
        {showS && (
          <motion.div
            key="s-letter"
            className="fixed inset-0 z-[60] flex items-center justify-center"
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.4 }}
          >
            {/* Pulsing glow behind S */}
            <motion.div
              className="absolute h-40 w-40 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(250,204,21,0.4) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* S letter */}
            <motion.p
              className="text-game text-8xl font-bold text-yellow-400"
              style={{
                textShadow: '0 0 40px rgba(250,204,21,0.6), 0 0 80px rgba(250,204,21,0.3)',
              }}
              initial={{ scale: 3, opacity: 0, filter: 'blur(10px)' }}
              animate={{
                scale: sTransitioning ? 0.8 : 1,
                opacity: sTransitioning ? 0 : 1,
                filter: 'blur(0px)',
              }}
              transition={
                sTransitioning
                  ? { duration: 0.4 }
                  : { type: 'spring', stiffness: 200, damping: 15 }
              }
            >
              S
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Golden embers ── */}
      <AnimatePresence>
        {showEmbers && (
          <motion.div
            key="golden-embers"
            className="fixed inset-0 z-[59] flex items-center justify-center"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {embers.map((e) => (
              <motion.div
                key={e.id}
                className="absolute h-2 w-2 rounded-full bg-yellow-400"
                style={{
                  boxShadow: '0 0 8px rgba(250,204,21,0.6)',
                }}
                initial={{ x: e.x, y: 0, opacity: 0 }}
                animate={{ x: e.x, y: -100, opacity: [0, 0.8, 0] }}
                transition={{
                  duration: e.duration,
                  delay: e.delay,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
