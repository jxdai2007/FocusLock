import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { analyzeFrame } from '@/lib/gemini'
import type { SessionContext, SessionState } from '@/lib/types'
import type { WebcamHandle } from '@/components/webcam/WebcamCapture'
import { useSessionStore } from '@/stores/sessionStore'

function buildContext(session: SessionState): SessionContext {
  return {
    sessionDuration: session.config.duration,
    focusScore: session.focusScore,
    livesRemaining: session.lives,
    totalLives: session.config.lives,
    currentStreak: Math.floor(session.currentStreak / 60),
    bestStreak: Math.floor(session.bestStreak / 60),
    distractionCount: session.distractionLog.length,
  }
}

export function useSessionLoop(webcamRef: RefObject<WebcamHandle>) {
  const loopRef = useRef(false)
  const hiddenAtRef = useRef<number | null>(null)
  const isAnalyzing = useSessionStore((s) => s.isAnalyzing)
  const appState = useSessionStore((s) => s.appState)

  async function runTick() {
    const { session, processAnalysis, endSession, setIsAnalyzing } = useSessionStore.getState()
    if (!loopRef.current || !session || session.isPaused) return

    const frame = webcamRef.current?.captureFrame() ?? null
    if (!frame) return

    setIsAnalyzing(true)
    try {
      const analysis = await analyzeFrame(frame, session.config, buildContext(session))
      if (!analysis) return
      processAnalysis(analysis)
      if (useSessionStore.getState().session?.lives === 0) endSession()
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Tab visibility: record when hidden, penalise on return based on elapsed time
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        const { appState: s } = useSessionStore.getState()
        if (s === 'active') hiddenAtRef.current = Date.now()
        return
      }

      // Tab became visible — check how long they were gone
      if (hiddenAtRef.current === null) return
      const elapsed = (Date.now() - hiddenAtRef.current) / 1000
      hiddenAtRef.current = null

      const { appState: s, session, processAnalysis, endSession } = useSessionStore.getState()
      if (s !== 'active' || !session) return

      const roast = 'Welcome back. We noticed you left.'
      if (elapsed > 30) {
        // Long absence: full distraction, lose a life
        processAnalysis({ status: 'distracted', distraction_type: 'looking_away', confidence: 1.0, roast })
        if (useSessionStore.getState().session?.lives === 0) endSession()
      } else {
        // Short absence: just a warning toast, no life lost
        processAnalysis({ status: 'focused', distraction_type: null, confidence: 1.0, roast })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // Main loop: starts when appState becomes active, stops otherwise
  useEffect(() => {
    if (appState !== 'active') {
      loopRef.current = false
      return
    }

    loopRef.current = true

    const analysisId = setInterval(runTick, 12_000)

    const tickId = setInterval(() => {
      const { session, endSession } = useSessionStore.getState()
      if (!session) return
      const elapsed = (Date.now() - session.startTime) / 1000
      if (elapsed >= session.config.duration * 60) endSession()
    }, 1_000)

    return () => {
      loopRef.current = false
      clearInterval(analysisId)
      clearInterval(tickId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState])

  return { isAnalyzing }
}
