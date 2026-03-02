'use client'

import { useEffect, useRef, useState } from 'react'
import type { FlameState } from '@/components/flame/FocusFlame'
import { useSessionStore, type AppState } from '@/stores/sessionStore'

export function useFlameState() {
  const appState = useSessionStore((s) => s.appState)
  const session = useSessionStore((s) => s.session)
  const isGameOver = useSessionStore((s) => s.isGameOver)

  const [flameState, setFlameState] = useState<FlameState>('idle')
  const prevAppStateRef = useRef<AppState>(appState)
  const prevLivesRef = useRef<number>(session?.lives ?? 3)
  const flareTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Track app-state transitions
  useEffect(() => {
    const prev = prevAppStateRef.current
    prevAppStateRef.current = appState

    if (appState === 'idle') {
      setFlameState('idle')
    } else if (appState === 'setup') {
      setFlameState('setup')
    } else if (appState === 'active' && (prev === 'setup' || prev === 'idle')) {
      // Flare up on session start
      setFlameState('flare')
      flareTimeoutRef.current = setTimeout(() => setFlameState('focused'), 600)
    } else if (appState === 'summary') {
      setFlameState('session-end')
    }

    return () => {
      if (flareTimeoutRef.current) clearTimeout(flareTimeoutRef.current)
    }
  }, [appState])

  // Game-over: dying flame
  useEffect(() => {
    if (isGameOver) setFlameState('dying')
  }, [isGameOver])

  // Life-lost detection + focus status mapping during active session
  useEffect(() => {
    if (!session || (appState !== 'active' && appState !== 'paused')) return
    if (isGameOver) return // dying handled above

    const prevLives = prevLivesRef.current
    prevLivesRef.current = session.lives

    if (session.lives < prevLives) {
      setFlameState('life-lost')
      const t = setTimeout(() => {
        const last = session.lastAnalysis?.status
        setFlameState(last === 'distracted' ? 'distracted' : last === 'away' ? 'away' : 'focused')
      }, 800)
      return () => clearTimeout(t)
    }

    // Normal focus status mapping (skip during flare)
    if (flameState === 'flare') return
    if (session.isPaused) return

    const last = session.lastAnalysis?.status
    if (last === 'distracted') setFlameState('distracted')
    else if (last === 'away') setFlameState('away')
    else setFlameState('focused')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.lives, session?.lastAnalysis?.status, session?.isPaused, appState, isGameOver])

  const intensity = session?.focusScore ?? 30
  const streak = 0
  const coins = 0

  return { flameState, intensity, streak, coins }
}
