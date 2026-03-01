import type {
  AnalysisEvent,
  FocusAnalysis,
  SessionConfig,
  SessionState,
  SessionSummaryData,
} from './types'

// ---------------------------------------------------------------------------
// createInitialState
// ---------------------------------------------------------------------------

export function createInitialState(config: SessionConfig): SessionState {
  return {
    isActive: true,
    isPaused: false,
    config,
    startTime: Date.now(),
    focusScore: 100,
    currentStreak: 0,
    bestStreak: 0,
    lives: config.lives,
    livesLost: 0,
    totalFocusedTime: 0,
    totalDistractedTime: 0,
    distractionLog: [],
    analysisHistory: [],
    lastAnalysis: null,
    coinsEarned: 0,
    hadComeback: false,
    hasShield: false,
    hasRevive: false,
  }
}

// ---------------------------------------------------------------------------
// calculateFocusScore
// ---------------------------------------------------------------------------

function statusToScore(status: string): number {
  if (status === 'focused') return 100
  if (status === 'distracted') return 20
  return 0 // away
}

export function calculateFocusScore(history: AnalysisEvent[]): number {
  const window = history.slice(-20)
  if (window.length === 0) return 100

  const n = window.length
  let weightedSum = 0
  let totalWeight = 0

  window.forEach((event, i) => {
    const weight = n === 1 ? 1.0 : 0.2 + (0.8 * i) / (n - 1)
    weightedSum += statusToScore(event.status) * weight
    totalWeight += weight
  })

  return Math.round(weightedSum / totalWeight)
}

// ---------------------------------------------------------------------------
// updateSession — immutable, pure
// ---------------------------------------------------------------------------

export function updateSession(
  state: SessionState,
  analysis: FocusAnalysis,
  intervalSeconds: number,
): SessionState {
  const prevStatus = state.lastAnalysis?.status ?? null
  const isDistractedOrAway = analysis.status === 'distracted' || analysis.status === 'away'
  const isNewDistraction = isDistractedOrAway && prevStatus === 'focused'

  const score = statusToScore(analysis.status)
  const newEvent: AnalysisEvent = {
    timestamp: Date.now(),
    status: analysis.status,
    score,
  }
  const newHistory = [...state.analysisHistory, newEvent]
  const newFocusScore = calculateFocusScore(newHistory)
  const hadComeback = state.hadComeback || (state.focusScore < 50 && newFocusScore >= 80)

  let currentStreak = state.currentStreak
  let bestStreak = state.bestStreak
  let totalFocusedTime = state.totalFocusedTime
  let totalDistractedTime = state.totalDistractedTime
  let lives = state.lives
  let livesLost = state.livesLost
  let distractionLog = state.distractionLog

  if (analysis.status === 'focused') {
    currentStreak += intervalSeconds
    totalFocusedTime += intervalSeconds
    if (currentStreak > bestStreak) bestStreak = currentStreak
  } else {
    currentStreak = 0
    totalDistractedTime += intervalSeconds

    if (isNewDistraction) {
      lives = Math.max(0, lives - 1)
      livesLost += 1
      distractionLog = [
        ...distractionLog,
        {
          timestamp: Date.now(),
          type: analysis.distraction_type ?? 'unknown',
          duration: intervalSeconds,
        },
      ]
    }
  }

  return {
    ...state,
    focusScore: newFocusScore,
    currentStreak,
    bestStreak,
    totalFocusedTime,
    totalDistractedTime,
    lives,
    livesLost,
    distractionLog,
    analysisHistory: newHistory,
    lastAnalysis: analysis,
    hadComeback,
  }
}

// ---------------------------------------------------------------------------
// calculateCoins
// ---------------------------------------------------------------------------

export function calculateCoins(state: SessionState): number {
  const focusedMinutes = Math.floor(state.totalFocusedTime / 60)
  const total = state.totalFocusedTime + state.totalDistractedTime
  const focusRate = total > 0 ? state.totalFocusedTime / total : 0

  let coins = 10
  coins += focusedMinutes * 1
  coins += state.lives * 5
  if (focusRate > 0.8) coins += 10
  if (state.livesLost === 0) coins += 20

  return coins
}

// ---------------------------------------------------------------------------
// getSessionSummary
// ---------------------------------------------------------------------------

export function getSessionSummary(
  state: SessionState,
  _config: SessionConfig,
): SessionSummaryData {
  const total = state.totalFocusedTime + state.totalDistractedTime
  const focusPercentage = total > 0 ? Math.round((state.totalFocusedTime / total) * 100) : 100

  const distractionsByType: Record<string, number> = {}
  for (const event of state.distractionLog) {
    distractionsByType[event.type] = (distractionsByType[event.type] ?? 0) + 1
  }

  return {
    totalMinutes: Math.round(total / 60),
    focusPercentage,
    bestStreakMinutes: Math.round(state.bestStreak / 60),
    livesRemaining: state.lives,
    livesLost: state.livesLost,
    distractionsByType,
    coinsEarned: calculateCoins(state),
    aiReview: '', // filled in by caller via generateSessionReview()
    timeline: state.analysisHistory,
    hadComeback: state.hadComeback,
  }
}

// ---------------------------------------------------------------------------
// checkMilestone
// ---------------------------------------------------------------------------

const STREAK_MILESTONES: Record<number, string> = {
  300: '🔥 5 minutes locked in!',
  900: '⚡ 15 min streak! On fire!',
  1800: '🏆 30 MIN STREAK! Unstoppable!',
  3600: '👑 ONE HOUR. Absolute legend.',
}

export function checkMilestone(
  prevState: SessionState,
  newState: SessionState,
): string | null {
  for (const [ms, label] of Object.entries(STREAK_MILESTONES)) {
    const milestone = Number(ms)
    if (prevState.currentStreak < milestone && newState.currentStreak >= milestone) {
      return label
    }
  }

  if (
    prevState.distractionLog.length === 0 &&
    newState.distractionLog.length === 1
  ) {
    return '👀 FocusLock is watching...'
  }

  if (prevState.focusScore < 50 && newState.focusScore >= 80) {
    return '📈 Comeback! Back in the zone.'
  }

  return null
}
