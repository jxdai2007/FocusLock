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
  hasShield: boolean
  hasRevive: boolean
  captureInterval: number
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
  inventory: InventoryItem[]
  activeItems: string[]
}

export interface ShopItem {
  id: string
  name: string
  description: string
  icon: string
  cost: number
  category: 'lives' | 'streaks' | 'coins' | 'cosmetic'
  effect: string
  stackable: boolean
}

export interface InventoryItem {
  itemId: string
  quantity: number
}

export interface RoomPlayer {
  id: string
  name: string
  focusScore: number
  currentStreak: number
  lives: number
  livesTotal: number
  status: 'focused' | 'distracted' | 'away' | 'idle'
  lastUpdate: number
  coinsEarned: number
}

export interface StudyRoom {
  id: string
  hostId: string
  createdAt: number
  players: Record<string, RoomPlayer>
  isActive: boolean
}

export interface CaughtMoment {
  id: string
  imageData: string
  timestamp: number
  type: 'distracted' | 'focused' | 'away'
  distractionType: string | null
  roast: string
  focusScore: number
}

export interface AppSettings {
  soundEnabled: boolean
  soundVolume: number
  backgroundSoundsEnabled: boolean
  backgroundSoundsVolume: number
  roastToastsEnabled: boolean
  milestoneToastsEnabled: boolean
  voiceRoastsEnabled: boolean
  webcamPreviewVisible: boolean
  captureInterval: number
}
