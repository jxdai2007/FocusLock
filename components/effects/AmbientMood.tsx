'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'

const GRADIENTS = {
  focused:
    'radial-gradient(circle at 50% 35%, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.03) 30%, transparent 60%)',
  drifting:
    'radial-gradient(circle at 50% 35%, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 30%, transparent 60%)',
  distracted:
    'radial-gradient(circle at 50% 35%, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.04) 30%, transparent 60%)',
  idle:
    'radial-gradient(circle at 50% 50%, rgba(245,158,11,0.12) 0%, transparent 70%)',
} as const

const PULSE_GRADIENT =
  'radial-gradient(circle at 50% 35%, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.08) 30%, transparent 60%)'

function getGradient(focusScore: number, isActive: boolean): string {
  if (!isActive) return GRADIENTS.idle
  if (focusScore >= 70) return GRADIENTS.focused
  if (focusScore >= 40) return GRADIENTS.drifting
  return GRADIENTS.distracted
}

interface AmbientMoodProps {
  focusScore: number
  isActive: boolean
  lifeLostTrigger: number
}

export default function AmbientMood({ focusScore, isActive, lifeLostTrigger }: AmbientMoodProps) {
  const controls = useAnimationControls()
  const prevTrigger = useRef(lifeLostTrigger)
  const [isPulsing, setIsPulsing] = useState(false)

  const baseGradient = getGradient(focusScore, isActive)

  // Active states: animate gradient transitions
  useEffect(() => {
    if (isPulsing || !isActive) return
    controls.start({ background: baseGradient, opacity: 1 }, { duration: 2, ease: 'easeInOut' })
  }, [baseGradient, controls, isPulsing, isActive])

  // Pulse red on life lost
  useEffect(() => {
    if (lifeLostTrigger === prevTrigger.current) return
    prevTrigger.current = lifeLostTrigger

    setIsPulsing(true)
    controls
      .start({ background: PULSE_GRADIENT, opacity: 1 }, { duration: 0.3 })
      .then(() => controls.start({ background: baseGradient, opacity: 1 }, { duration: 1, ease: 'easeOut' }))
      .then(() => setIsPulsing(false))
  }, [lifeLostTrigger, baseGradient, controls])

  return (
    <>
      {/* Active-state gradient layer */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        animate={controls}
        initial={{ background: baseGradient, opacity: isActive ? 1 : 0 }}
      />

      {/* Idle: cascading outward ripple from flame center */}
      {!isActive && (
        <>
          <motion.div
            className="pointer-events-none fixed z-0"
            aria-hidden
            style={{
              width: 300,
              height: 300,
              borderRadius: '50%',
              top: '35%',
              left: '50%',
              x: '-50%',
              y: '-50%',
              background: GRADIENTS.idle,
            }}
            animate={{ scale: [0.3, 2.5], opacity: [0.7, 0] }}
            transition={{ duration: 3.5, ease: 'easeOut', repeat: Infinity }}
          />
          <motion.div
            className="pointer-events-none fixed z-0"
            aria-hidden
            style={{
              width: 300,
              height: 300,
              borderRadius: '50%',
              top: '35%',
              left: '50%',
              x: '-50%',
              y: '-50%',
              background: GRADIENTS.idle,
            }}
            animate={{ scale: [0.3, 2.5], opacity: [0.7, 0] }}
            transition={{ duration: 3.5, ease: 'easeOut', repeat: Infinity, delay: 1.75 }}
          />
        </>
      )}
    </>
  )
}
