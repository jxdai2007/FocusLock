'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = [
  'bg-yellow-400',
  'bg-amber-400',
  'bg-orange-400',
  'bg-green-400',
  'bg-red-400',
  'bg-blue-400',
  'bg-purple-400',
]

// ---------------------------------------------------------------------------
// Data generators
// ---------------------------------------------------------------------------

function makeConfettiPieces(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const w = 8 + Math.random() * 10       // 8–18px
    const h = 10 + Math.random() * 14      // 10–24px
    return {
      id: i,
      x: Math.random() * 100,              // vw position
      width: w,
      height: h,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rounded: Math.random() > 0.5,        // square vs rectangle
      drift: (Math.random() - 0.5) * 300,  // ±150px horizontal drift
      rotate: 360 + Math.random() * 720,   // 360–1080 deg
      duration: 2.5 + Math.random() * 2.5, // 2.5–5s (slower, more visible)
      delay: Math.random() * 1.0,          // 0–1.0s (wider stagger)
    }
  })
}

function makeStarPieces(count: number, offset: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: offset + i,
    x: Math.random() * 100,
    drift: (Math.random() - 0.5) * 250,
    rotate: 360 + Math.random() * 720,
    duration: 3 + Math.random() * 2,
    delay: Math.random() * 1.0,
  }))
}

// ---------------------------------------------------------------------------
// ConfettiExplosion
// ---------------------------------------------------------------------------

interface ConfettiExplosionProps {
  count?: number
  includeStars?: boolean
}

export default function ConfettiExplosion({ count = 40, includeStars = false }: ConfettiExplosionProps) {
  const pieces = useMemo(() => makeConfettiPieces(count), [count])
  const stars = useMemo(
    () => (includeStars ? makeStarPieces(10, count) : []),
    [includeStars, count],
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-[50] overflow-hidden">
      {/* Confetti pieces */}
      {pieces.map((p) => (
        <motion.div
          key={`c-${p.id}`}
          className={`absolute ${p.color} ${p.rounded ? 'rounded-sm' : 'rounded-none'}`}
          style={{
            width: p.width,
            height: p.height,
            left: `${p.x}%`,
            top: '-10vh',
          }}
          animate={{
            y: '120vh',
            x: p.drift,
            rotate: p.rotate,
            opacity: [1, 1, 1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'linear',
          }}
        />
      ))}

      {/* Star pieces (S-rank only) */}
      {stars.map((s) => (
        <motion.span
          key={`s-${s.id}`}
          className="absolute text-2xl"
          style={{
            left: `${s.x}%`,
            top: '-10vh',
          }}
          animate={{
            y: '120vh',
            x: s.drift,
            rotate: s.rotate,
            opacity: [1, 1, 1, 1, 0],
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            ease: 'linear',
          }}
        >
          ⭐
        </motion.span>
      ))}
    </div>
  )
}
