import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { analyzeFrame } from '@/lib/gemini'
import { composeFrames } from '@/lib/frameComposer'
import { captureMoment } from '@/lib/photoCapture'
import type { SessionContext, SessionState } from '@/lib/types'
import type { WebcamHandle } from '@/components/webcam/WebcamCapture'
import type { ScreenHandle } from '@/components/webcam/ScreenCapture'
import { useSessionStore } from '@/stores/sessionStore'

const TICK_MS = 1_000

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

export function useSessionLoop(
  webcamRef: RefObject<WebcamHandle>,
  screenRef?: RefObject<ScreenHandle>,
) {
  const loopRef = useRef(false)
  const hiddenAtRef = useRef<number | null>(null)
  const pendingRef = useRef(false)
  const lastFrameRef = useRef<string | null>(null)
  const isAnalyzing = useSessionStore((s) => s.isAnalyzing)
  const appState = useSessionStore((s) => s.appState)

  // Tab visibility: penalise on return (skipped when sharing screen, since user needs other windows).
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        const { appState: s } = useSessionStore.getState()
        if (s === 'active') hiddenAtRef.current = Date.now()
        return
      }
      if (hiddenAtRef.current === null) return
      const elapsed = (Date.now() - hiddenAtRef.current) / 1000
      hiddenAtRef.current = null

      const { appState: s, session, processAnalysis, endSession } = useSessionStore.getState()
      if (s !== 'active' || !session) return
      if (session.config.watchScreen) return

      const roast = 'Welcome back. We noticed you left.'
      if (elapsed > 30) {
        processAnalysis({ status: 'distracted', distraction_type: 'looking_away', confidence: 1.0, roast })
        if (useSessionStore.getState().session?.lives === 0) endSession()
      } else {
        processAnalysis({ status: 'focused', distraction_type: null, confidence: 1.0, roast })
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // Main 1Hz REST loop. Skip-if-pending so slow responses don't stack.
  useEffect(() => {
    if (appState !== 'active') {
      loopRef.current = false
      return
    }
    loopRef.current = true

    async function runTick() {
      if (!loopRef.current) return
      if (pendingRef.current) return // previous request still flying; skip
      const { session, processAnalysis, endSession, setIsAnalyzing } = useSessionStore.getState()
      if (!session || session.isPaused) return

      const wc = webcamRef.current?.captureFrame() ?? null
      if (!wc) return
      const sc = screenRef?.current?.captureFrame() ?? null
      const composite = await composeFrames(wc, sc)
      lastFrameRef.current = composite

      pendingRef.current = true
      setIsAnalyzing(true)
      try {
        const analysis = await analyzeFrame(composite, session.config, buildContext(session))
        if (!loopRef.current) return
        if (analysis) {
          processAnalysis(analysis)
          const updated = useSessionStore.getState().session
          if (updated) captureMoment(composite, analysis, updated)
          if (useSessionStore.getState().session?.lives === 0) endSession()
        }
      } finally {
        pendingRef.current = false
        setIsAnalyzing(false)
      }
    }

    // Fire first tick immediately, then every second.
    void runTick()
    const tickId = setInterval(runTick, TICK_MS)

    // Duration-end check.
    const durId = setInterval(() => {
      const { session, endSession } = useSessionStore.getState()
      if (!session) return
      const elapsed = (Date.now() - session.startTime) / 1000
      if (elapsed >= session.config.duration * 60) endSession()
    }, 1_000)

    return () => {
      loopRef.current = false
      clearInterval(tickId)
      clearInterval(durId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState])

  return { isAnalyzing }
}
