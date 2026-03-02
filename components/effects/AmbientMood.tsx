'use client'

import { useEffect, useRef } from 'react'

const GRADIENTS = {
  focused:
    'radial-gradient(circle 600px at 50% 35%, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.03) 40%, transparent 70%)',
  drifting:
    'radial-gradient(circle 600px at 50% 35%, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 40%, transparent 70%)',
  distracted:
    'radial-gradient(circle 600px at 50% 35%, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.04) 40%, transparent 70%)',
  idle:
    'radial-gradient(circle 600px at 50% 35%, rgba(245,158,11,0.12) 0%, transparent 70%)',
  lifeLost:
    'radial-gradient(circle 600px at 50% 35%, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.08) 40%, transparent 70%)',
}

function getGradient(focusScore: number, isActive: boolean, themeMoodColor?: string): string {
  if (!isActive) {
    if (themeMoodColor) {
      return `radial-gradient(circle 600px at 50% 35%, ${themeMoodColor} 0%, transparent 70%)`
    }
    return GRADIENTS.idle
  }
  if (focusScore >= 70) return GRADIENTS.focused
  if (focusScore >= 40) return GRADIENTS.drifting
  return GRADIENTS.distracted
}

interface AmbientMoodProps {
  focusScore: number
  isActive: boolean
  lifeLostTrigger: number
  themeMoodColor?: string
}

export default function AmbientMood({ focusScore, isActive, lifeLostTrigger, themeMoodColor }: AmbientMoodProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const prevTrigger = useRef(lifeLostTrigger)

  const gradient = getGradient(focusScore, isActive, themeMoodColor)
  const gradientRef = useRef(gradient)
  gradientRef.current = gradient

  // Life-lost pulse: briefly flash red then return
  useEffect(() => {
    if (lifeLostTrigger === prevTrigger.current) return
    prevTrigger.current = lifeLostTrigger

    const el = divRef.current
    if (!el) return

    // Flash red gradient
    el.style.background = GRADIENTS.lifeLost
    el.style.opacity = '1'
    el.style.animation = 'none'

    const t = setTimeout(() => {
      // Read current gradient from ref to avoid stale closure
      el.style.background = gradientRef.current
      el.style.opacity = ''
      el.style.animation = ''
    }, 300)

    return () => clearTimeout(t)
  }, [lifeLostTrigger])

  return (
    <div
      ref={divRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
      style={{
        background: gradient,
        transition: 'background 2s ease-in-out',
        animation: isActive ? 'ambient-breathe 4s ease-in-out infinite' : 'none',
      }}
    />
  )
}
