'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import FlameParticles from '@/components/effects/FlameParticles'
import { getTheme } from '@/lib/themes'
import { useSessionStore } from '@/stores/sessionStore'
import fireAnimation from './Fire.json'

export type FlameState =
  | 'idle'
  | 'setup'
  | 'focused'
  | 'distracted'
  | 'away'
  | 'life-lost'
  | 'session-end'
  | 'flare'
  | 'dying'

interface FocusFlameProps {
  state: FlameState
  intensity: number // 0–100
  streak: number
  coins: number
}

function getScale(state: FlameState, intensity: number): number {
  switch (state) {
    case 'idle':        return 0.6
    case 'setup':       return 0.7
    case 'focused':     return 0.8 + (intensity / 100) * 0.7   // 0.8 → 1.5
    case 'distracted':  return 0.4
    case 'away':        return 0.3
    case 'life-lost':   return 0.4
    case 'session-end': return 0.2
    case 'flare':       return 1.1
    case 'dying':       return 0
  }
}

function getLottieSpeed(state: FlameState, intensity: number): number {
  switch (state) {
    case 'idle':        return 0.5
    case 'setup':       return 0.7
    case 'focused':     return 0.8 + (intensity / 100) * 1.2   // 0.8 → 2.0
    case 'distracted':  return 0.5
    case 'away':        return 0.3
    case 'life-lost':   return 0.5
    case 'session-end': return 0.3
    case 'flare':       return 2.0
    case 'dying':       return 0.3
  }
}

function getGlowColor(state: FlameState, intensity: number, themeGlow: string): string {
  switch (state) {
    case 'idle':        return themeGlow
    case 'setup':       return themeGlow
    case 'focused':     return themeGlow
    case 'flare':       return themeGlow
    case 'distracted':  return 'rgba(80,80,80,0.10)'
    case 'away':        return 'rgba(80,80,80,0.05)'
    case 'life-lost':   return 'rgba(220,38,38,0.40)'
    case 'session-end': return 'rgba(245,158,11,0.05)'
    case 'dying':       return 'rgba(220,38,38,0.20)'
  }
}

// Build the Framer Motion animate + transition objects for the flame wrapper
function getFlameAnimation(state: FlameState, intensity: number) {
  const scale = getScale(state, intensity)

  // Idle: gentle breathing
  if (state === 'idle') {
    return {
      animate: { scale: [0.57, 0.62, 0.57] as number[], x: 0 },
      transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' as const },
    }
  }

  // Flare: scale spike on session start
  if (state === 'flare') {
    return {
      animate: { scale: [1, 1.4, 1.1] as number[], x: 0 },
      transition: { type: 'spring' as const, stiffness: 200, damping: 12 },
    }
  }

  // Dying: sputter and extinguish
  if (state === 'dying') {
    return {
      animate: { scale: [0.8, 0.3, 0.6, 0.2, 0.4, 0.1, 0] as number[], x: 0, opacity: [1, 1, 1, 1, 1, 0.5, 0] as number[] },
      transition: { duration: 0.8, ease: 'easeIn' as const },
    }
  }

  if (state === 'distracted') {
    return {
      animate: { scale: [0.40, 0.30, 0.50, 0.35, 0.45, 0.40] as number[], x: 0 },
      transition: { repeat: Infinity, duration: 0.8, ease: 'easeInOut' as const },
    }
  }

  if (state === 'life-lost') {
    return {
      animate: { x: [0, -10, 10, -8, 8, -5, 5, 0] as number[], scale },
      transition: { duration: 0.5 },
    }
  }

  if (state === 'session-end') {
    return {
      animate: { scale, x: 0 },
      transition: { duration: 2, ease: 'easeInOut' as const },
    }
  }

  return {
    animate: { scale, x: 0 },
    transition: { type: 'spring' as const, stiffness: 100, damping: 15 },
  }
}

export default function FocusFlame({ state, intensity, streak, coins }: FocusFlameProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const [showFlash, setShowFlash] = useState(false)
  const activeThemeId = useSessionStore((s) => s.userStats.activeTheme)
  const theme = getTheme(activeThemeId)

  // Update Lottie playback speed whenever state or intensity changes
  useEffect(() => {
    lottieRef.current?.setSpeed(getLottieSpeed(state, intensity))
  }, [state, intensity])

  // Trigger red flash on life-lost
  useEffect(() => {
    if (state === 'life-lost') {
      setShowFlash(true)
      const timer = setTimeout(() => setShowFlash(false), 200)
      return () => clearTimeout(timer)
    }
  }, [state])

  const { animate, transition } = getFlameAnimation(state, intensity)
  const glowColor = getGlowColor(state, intensity, theme.colors.glow)

  return (
    <div className="relative flex items-center justify-center" style={{ width: 300, height: 360 }}>
      {/* Full-screen red flash on life-lost */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-50"
            style={{ backgroundColor: '#dc2626' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          />
        )}
      </AnimatePresence>

      {/* Radial glow behind flame */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 400, height: 400, filter: 'blur(80px)' }}
        animate={
          state === 'idle'
            ? { backgroundColor: glowColor, opacity: [0.6, 1, 0.6] }
            : state === 'dying'
            ? { backgroundColor: glowColor, opacity: 0 }
            : { backgroundColor: glowColor, opacity: 1 }
        }
        transition={
          state === 'idle'
            ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
            : state === 'dying'
            ? { duration: 0.8 }
            : { duration: 0.8 }
        }
      />

      {/* Flame particles — behind Lottie, above glow */}
      <FlameParticles state={state} intensity={intensity} particleColors={theme.colors.particles} />

      {/* Flame — Lottie wrapped in Framer Motion for state-driven animation */}
      <motion.div
        className="relative z-10"
        style={{ width: 200, height: 300, filter: theme.lottieFilter || 'none' }}
        initial={{ scale: 0 }}
        animate={animate}
        transition={transition}
      >
        <Lottie
          lottieRef={lottieRef}
          animationData={fireAnimation}
          loop
          autoplay
          style={{ width: '100%', height: '100%' }}
        />
      </motion.div>

      {/* Coin counter — top-right */}
      {coins > 0 && (
        <div className="absolute top-2 right-0 text-game text-sm font-bold text-yellow-400 select-none">
          🪙 {coins}
        </div>
      )}

      {/* Streak badge — bottom-right */}
      {streak > 0 && (
        <div className="absolute bottom-2 right-0 text-game text-sm font-bold text-amber-400 select-none">
          🔥 {streak}
        </div>
      )}
    </div>
  )
}
