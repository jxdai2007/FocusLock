import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  createInitialState,
  updateSession,
  checkMilestone,
  getSessionSummary,
} from '@/lib/focusEngine'
import { checkAchievements, mergeAchievements } from '@/lib/achievements'
import { getItem, getInventoryCount, canAfford } from '@/lib/shop'
import { playLifeLost, playNudge } from '@/lib/sounds'
import type {
  Achievement,
  FocusAnalysis,
  InventoryItem,
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
  inventory: [],
  activeItems: [],
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
  // shop & inventory
  purchaseItem: (itemId: string) => boolean
  activateItem: (itemId: string) => void
  deactivateItem: (itemId: string) => void
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addToInventory(inventory: InventoryItem[], itemId: string): InventoryItem[] {
  const existing = inventory.find((i) => i.itemId === itemId)
  if (existing) {
    return inventory.map((i) => (i.itemId === itemId ? { ...i, quantity: i.quantity + 1 } : i))
  }
  return [...inventory, { itemId, quantity: 1 }]
}

function removeFromInventory(inventory: InventoryItem[], itemId: string): InventoryItem[] {
  return inventory
    .map((i) => (i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i))
    .filter((i) => i.quantity > 0)
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

      startSession: (config: SessionConfig) => {
        const { userStats } = get()
        const { activeItems } = userStats

        let session = createInitialState(config)

        // Apply active items
        const bonusLives = activeItems.filter((id) => id === 'extra_life').length
        if (bonusLives > 0) {
          session = {
            ...session,
            lives: session.lives + bonusLives,
            config: { ...session.config, lives: session.config.lives + bonusLives },
          }
        }
        if (activeItems.includes('shield')) {
          session = { ...session, hasShield: true }
        }
        if (activeItems.includes('phoenix')) {
          session = { ...session, hasRevive: true }
        }

        set({
          session,
          appState: 'active',
          latestRoast: null,
          latestMilestone: null,
          sessionSummary: null,
          newlyUnlockedAchievements: [],
          isGameOver: false,
        })
      },

      processAnalysis: (analysis: FocusAnalysis) => {
        const { session } = get()
        if (!session) return
        let next = updateSession(session, analysis, 12)
        const milestone = checkMilestone(session, next)
        let roast = analysis.roast
        let lifeLost = next.livesLost > session.livesLost

        // Shield: absorb first life loss
        if (lifeLost && next.hasShield) {
          next = { ...next, lives: next.lives + 1, livesLost: next.livesLost - 1, hasShield: false }
          roast = "🛡️ Shield absorbed that one! Don't waste it."
          lifeLost = false
        }

        // Revive: if lives hit 0 and has revive
        if (next.lives === 0 && next.hasRevive) {
          next = { ...next, lives: 1, hasRevive: false }
          roast = "🪶 The Phoenix Feather saved you! You're back with 1 life."
        }

        if (lifeLost) playLifeLost()
        else playNudge()

        set({
          session: next,
          latestRoast: { message: roast, status: analysis.status },
          ...(milestone ? { latestMilestone: milestone } : {}),
          ...(next.lives === 0 ? { isGameOver: true } : {}),
        })

        // Sync to multiplayer room if in one
        try {
          const { useMultiplayerStore } = require('@/stores/multiplayerStore')
          const mp = useMultiplayerStore.getState()
          if (mp.isInRoom) mp.syncLocalState(next)
        } catch { /* multiplayer store not available */ }
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

        // Coin multipliers from active items
        let coins = summary.coinsEarned
        if (userStats.activeItems.includes('double_coins')) coins *= 2
        else if (userStats.activeItems.includes('coin_magnet')) coins = Math.round(coins * 1.5)
        summary.coinsEarned = coins

        // Day streak logic with streak freeze
        let newDayStreak = userStats.dayStreak
        let newInventory = [...userStats.inventory]

        if (summary.focusPercentage > 50) {
          if (userStats.lastSessionDate === today) {
            // no change
          } else if (userStats.lastSessionDate === yesterday) {
            newDayStreak = userStats.dayStreak + 1
          } else {
            // Missed a day — check for streak freeze
            if (userStats.dayStreak > 0) {
              const freezeIdx = newInventory.findIndex((i) => i.itemId === 'streak_freeze')
              if (freezeIdx !== -1) {
                newInventory = removeFromInventory(newInventory, 'streak_freeze')
                newDayStreak = userStats.dayStreak + 1
              } else {
                newDayStreak = 1
              }
            } else {
              newDayStreak = 1
            }
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
          totalCoins: userStats.totalCoins + coins,
          sessions: [savedSession, ...userStats.sessions].slice(0, 50),
          achievements: userStats.achievements,
          inventory: newInventory,
          activeItems: [], // clear active items after session
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

        // Mark player as idle in multiplayer room
        try {
          const { useMultiplayerStore } = require('@/stores/multiplayerStore')
          const mp = useMultiplayerStore.getState()
          if (mp.isInRoom) mp.markIdle()
        } catch { /* multiplayer store not available */ }
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

      // -- Shop & Inventory --

      purchaseItem: (itemId: string): boolean => {
        const { userStats } = get()
        const item = getItem(itemId)
        if (!canAfford(userStats.totalCoins, item)) return false
        if (!item.stackable && getInventoryCount(userStats.inventory, itemId) > 0) return false

        set({
          userStats: {
            ...userStats,
            totalCoins: userStats.totalCoins - item.cost,
            inventory: addToInventory(userStats.inventory, itemId),
          },
        })
        return true
      },

      activateItem: (itemId: string) => {
        const { userStats } = get()
        if (getInventoryCount(userStats.inventory, itemId) <= 0) return
        set({
          userStats: {
            ...userStats,
            inventory: removeFromInventory(userStats.inventory, itemId),
            activeItems: [...userStats.activeItems, itemId],
          },
        })
      },

      deactivateItem: (itemId: string) => {
        const { userStats } = get()
        const idx = userStats.activeItems.indexOf(itemId)
        if (idx === -1) return
        const newActive = [...userStats.activeItems]
        newActive.splice(idx, 1)
        set({
          userStats: {
            ...userStats,
            inventory: addToInventory(userStats.inventory, itemId),
            activeItems: newActive,
          },
        })
      },
    }),
    {
      name: 'focuslock-stats',
      partialize: (state) => ({ userStats: state.userStats }),
      merge: (persisted, current) => {
        const p = persisted as { userStats?: Partial<UserStats> } | undefined
        return {
          ...current,
          userStats: { ...DEFAULT_USER_STATS, ...current.userStats, ...p?.userStats },
        }
      },
    },
  ),
)
