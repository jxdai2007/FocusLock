import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  createInitialState,
  updateSession,
  checkMilestone,
  getSessionSummary,
} from '@/lib/focusEngine'
import { checkAchievements, mergeAchievements } from '@/lib/achievements'
import { playLifeLost, playNudge } from '@/lib/sounds'
import type {
  Achievement,
  FocusAnalysis,
  SessionConfig,
  SessionState,
  SessionSummaryData,
  UserStats,
} from '@/lib/types'

export type AppState = 'idle' | 'setup' | 'active' | 'paused' | 'summary'

const DEFAULT_USER_STATS: UserStats = {
  dayStreak: 0,
  lastSessionDate: '',
  totalSessions: 0,
  totalFocusMinutes: 0,
  totalCoins: 0,
  sessions: [],
  achievements: [],
}

interface StoreState {
  // ephemeral
  session: SessionState | null
  appState: AppState
  latestRoast: { message: string; status: string } | null
  latestMilestone: string | null
  isAnalyzing: boolean
  sessionSummary: SessionSummaryData | null
  newlyUnlockedAchievements: Achievement[]
  isGameOver: boolean
  // persisted
  userStats: UserStats
  // actions
  openSetup: () => void
  startSession: (config: SessionConfig) => void
  processAnalysis: (analysis: FocusAnalysis) => void
  pauseSession: () => void
  resumeSession: () => void
  endSession: () => void
  returnToIdle: () => void
  clearRoast: () => void
  clearMilestone: () => void
  clearNewAchievements: () => void
  setIsAnalyzing: (v: boolean) => void
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export const useSessionStore = create<StoreState>()(
  persist(
    (set, get) => ({
      session: null,
      appState: 'idle',
      latestRoast: null,
      latestMilestone: null,
      isAnalyzing: false,
      sessionSummary: null,
      newlyUnlockedAchievements: [],
      isGameOver: false,
      userStats: DEFAULT_USER_STATS,

      openSetup: () => set({ appState: 'setup' }),

      startSession: (config: SessionConfig) =>
        set({
          session: createInitialState(config),
          appState: 'active',
          latestRoast: null,
          latestMilestone: null,
          sessionSummary: null,
          newlyUnlockedAchievements: [],
          isGameOver: false,
        }),

      processAnalysis: (analysis: FocusAnalysis) => {
        const { session } = get()
        if (!session) return
        const next = updateSession(session, analysis, 12)
        const milestone = checkMilestone(session, next)
        if (next.livesLost > session.livesLost) playLifeLost()
        else playNudge()
        set({
          session: next,
          latestRoast: { message: analysis.roast, status: analysis.status },
          ...(milestone ? { latestMilestone: milestone } : {}),
          ...(next.lives === 0 ? { isGameOver: true } : {}),
        })
      },

      pauseSession: () => {
        const { session } = get()
        if (!session) return
        set({ session: { ...session, isPaused: true }, appState: 'paused' })
      },

      resumeSession: () => {
        const { session } = get()
        if (!session) return
        set({ session: { ...session, isPaused: false }, appState: 'active' })
      },

      endSession: () => {
        const { session, userStats } = get()
        if (!session) return
        const summary = getSessionSummary(session, session.config)
        const today = toDateString(new Date())
        const yesterday = toDateString(new Date(Date.now() - 86400000))

        let newDayStreak = userStats.dayStreak
        if (summary.focusPercentage > 50) {
          if (userStats.lastSessionDate === today) {
            // no change
          } else if (userStats.lastSessionDate === yesterday) {
            newDayStreak = userStats.dayStreak + 1
          } else {
            newDayStreak = 1
          }
        } else {
          newDayStreak = 0
        }

        const savedSession = {
          id: Date.now().toString(),
          date: today,
          summary,
        }

        const newUserStats: UserStats = {
          dayStreak: newDayStreak,
          lastSessionDate: today,
          totalSessions: userStats.totalSessions + 1,
          totalFocusMinutes: userStats.totalFocusMinutes + summary.totalMinutes,
          totalCoins: userStats.totalCoins + summary.coinsEarned,
          sessions: [savedSession, ...userStats.sessions].slice(0, 50),
          achievements: userStats.achievements,
        }

        // Merge with master list (handles new achievements added in future releases)
        const mergedAchievements = mergeAchievements(newUserStats.achievements)
        const statsForCheck: UserStats = { ...newUserStats, achievements: mergedAchievements }

        // Find newly unlocked
        const newlyUnlocked = checkAchievements(statsForCheck, summary, session.config)

        // Apply bonuses and mark as unlocked
        let bonusCoins = 0
        const updatedAchievements = mergedAchievements.map((a) => {
          if (newlyUnlocked.some((nu) => nu.id === a.id)) {
            bonusCoins += a.coinBonus
            return { ...a, unlocked: true, unlockedAt: today }
          }
          return a
        })

        const finalStats: UserStats = {
          ...statsForCheck,
          totalCoins: statsForCheck.totalCoins + bonusCoins,
          achievements: updatedAchievements,
        }

        set({
          sessionSummary: summary,
          userStats: finalStats,
          appState: 'summary',
          newlyUnlockedAchievements: newlyUnlocked,
        })
      },

      returnToIdle: () =>
        set({
          session: null,
          appState: 'idle',
          latestRoast: null,
          latestMilestone: null,
          sessionSummary: null,
          newlyUnlockedAchievements: [],
          isGameOver: false,
        }),

      clearRoast: () => set({ latestRoast: null }),
      clearMilestone: () => set({ latestMilestone: null }),
      clearNewAchievements: () => set({ newlyUnlockedAchievements: [] }),
      setIsAnalyzing: (v: boolean) => set({ isAnalyzing: v }),
    }),
    {
      name: 'focuslock-stats',
      partialize: (state) => ({ userStats: state.userStats }),
    },
  ),
)
