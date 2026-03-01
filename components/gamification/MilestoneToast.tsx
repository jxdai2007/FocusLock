'use client'

import { useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore } from '@/stores/sessionStore'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFETTI_COLORS = [
  'bg-yellow-400',
  'bg-amber-400',
  'bg-orange-400',
  'bg-red-400',
  'bg-green-400',
]

// ---------------------------------------------------------------------------
// MilestoneToast
// ---------------------------------------------------------------------------

export default function MilestoneToast() {
  const latestMilestone = useSessionStore((s) => s.latestMilestone)
  const clearMilestone = useSessionStore((s) => s.clearMilestone)

  // Auto-dismiss after 3.5 seconds
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!latestMilestone) return
    timerRef.current = setTimeout(() => clearMilestone(), 3500)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [latestMilestone, clearMilestone])

  // Confetti particles — stable per mount (re-generated on each new milestone
  // because AnimatePresence re-mounts the inner div when key changes)
  const particles = useMemo(
    () =>
      Array.from({ length: 13 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        tx: Math.floor(Math.random() * 160) - 80, // -80px to +80px
        ty: Math.floor(Math.random() * 120) - 60, // -60px to +60px
        delay: Math.random() * 0.2,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [latestMilestone], // regenerate on each new milestone
  )

  return (
    <div className="pointer-events-none fixed left-1/2 top-8 z-[60] -translate-x-1/2">
      <AnimatePresence>
        {latestMilestone && (
          <motion.div
            key={latestMilestone}
            className="relative max-w-sm rounded-2xl border-2 border-yellow-500/60 bg-zinc-900/90 px-6 py-4 shadow-[0_0_30px_rgba(250,204,21,0.25)] backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.5, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {/* Confetti particles */}
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-sm ${p.color}`}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: p.tx, y: p.ty, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.6, delay: p.delay, ease: 'easeOut' }}
              />
            ))}

            {/* Achievement label */}
            <p className="mb-1 text-center text-[10px] uppercase tracking-[0.2em] text-yellow-500/80">
              🏆 ACHIEVEMENT
            </p>

            {/* Milestone message */}
            <p className="text-game text-center text-base font-bold text-zinc-100">
              {latestMilestone}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
