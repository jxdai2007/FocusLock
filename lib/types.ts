export interface FocusAnalysis {
  status: 'focused' | 'distracted' | 'away'
  distraction_type:
    | 'phone'
    | 'sleeping'
    | 'chatting'
    | 'zoned_out'
    | 'eating'
    | 'looking_away'
    | null
  confidence: number
  roast: string
}

export interface SessionConfig {
  duration: number
  lives: number
  taskDescription: string
  allowedDevices: string[]
  blockedSites: string[]
}

export interface SessionState {
  isActive: boolean
  isPaused: boolean
  config: SessionConfig
  startTime: number
  focusScore: number
  currentStreak: number
  bestStreak: number
  lives: number
  livesLost: number
  totalFocusedTime: number
  totalDistractedTime: number
  distractionLog: DistractionEvent[]
  analysisHistory: AnalysisEvent[]
  lastAnalysis: FocusAnalysis | null
  coinsEarned: number
  hadComeback: boolean
}

export interface DistractionEvent {
  timestamp: number
  type: string
  duration: number
}

export interface AnalysisEvent {
  timestamp: number
  status: string
  score: number
}

export interface SessionContext {
  sessionDuration: number
  focusScore: number
  livesRemaining: number
  totalLives: number
  currentStreak: number
  bestStreak: number
  distractionCount: number
}

export interface SessionSummaryData {
  totalMinutes: number
  focusPercentage: number
  bestStreakMinutes: number
  livesRemaining: number
  livesLost: number
  distractionsByType: Record<string, number>
  coinsEarned: number
  aiReview: string
  timeline: AnalysisEvent[]
  hadComeback: boolean
}

export interface SavedSession {
  id: string
  date: string
  summary: SessionSummaryData
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  coinBonus: number
  unlocked: boolean
  unlockedAt: string | null
}

export interface UserStats {
  dayStreak: number
  lastSessionDate: string
  totalSessions: number
  totalFocusMinutes: number
  totalCoins: number
  sessions: SavedSession[]
  achievements: Achievement[]
}
