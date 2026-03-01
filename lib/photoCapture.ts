import type { CaughtMoment, FocusAnalysis, SessionState } from './types'

let moments: CaughtMoment[] = []
let focusedSnapshot: CaughtMoment | null = null
let lastFocusedCaptureTime = 0

const FOCUSED_INTERVAL = 5 * 60 * 1000

export function captureMoment(
  frame: string,
  analysis: FocusAnalysis,
  session: SessionState,
): void {
  const now = Date.now()
  const elapsed = now - session.startTime

  if (analysis.status === 'distracted' || analysis.status === 'away') {
    moments.push({
      id: `caught-${now}`,
      imageData: frame,
      timestamp: elapsed,
      type: analysis.status,
      distractionType: analysis.distraction_type,
      roast: analysis.roast,
      focusScore: session.focusScore,
    })
  } else if (analysis.status === 'focused') {
    if (now - lastFocusedCaptureTime >= FOCUSED_INTERVAL) {
      focusedSnapshot = {
        id: `focused-${now}`,
        imageData: frame,
        timestamp: elapsed,
        type: 'focused',
        distractionType: null,
        roast: analysis.roast,
        focusScore: session.focusScore,
      }
      lastFocusedCaptureTime = now
    }
  }
}

export function getBestMoment(): CaughtMoment | null {
  const distractions = moments.filter((m) => m.type === 'distracted' || m.type === 'away')
  if (distractions.length > 0) {
    const first = distractions[0]
    const lowest = distractions.reduce((min, m) => (m.focusScore < min.focusScore ? m : min))
    return first.focusScore <= lowest.focusScore + 5 ? first : lowest
  }
  return focusedSnapshot
}

export function getWorstMoment(): CaughtMoment | null {
  if (moments.length === 0) return focusedSnapshot
  return moments.reduce((worst, m) => (m.focusScore < worst.focusScore ? m : worst))
}

export function getAllDistractions(): CaughtMoment[] {
  return [...moments]
}

export function clear(): void {
  moments = []
  focusedSnapshot = null
  lastFocusedCaptureTime = 0
}
