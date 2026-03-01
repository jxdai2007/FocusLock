'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'

const EMBER_COLORS = ['bg-amber-500', 'bg-orange-500', 'bg-red-500', 'bg-yellow-500']

interface EmberParticlesProps {
  count?: number
}

export default function EmberParticles({ count = 12 }: EmberParticlesProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        color: EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
        x: Math.floor(Math.random() * 300) - 150,      // -150 to +150
        y: -(Math.floor(Math.random() * 200) + 100),    // -100 to -300
        size: Math.floor(Math.random() * 5) + 4,        // 4 to 8px
        rotate: Math.floor(Math.random() * 360),
        duration: 0.8 + Math.random() * 0.7,            // 0.8 to 1.5s
        delay: Math.random() * 0.3,
      })),
    [count],
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-sm ${p.color}`}
          style={{ width: p.size, height: p.size }}
          initial={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
          animate={{
            opacity: 0,
            scale: 0.5,
            x: p.x,
            y: p.y,
            rotate: p.rotate,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}
