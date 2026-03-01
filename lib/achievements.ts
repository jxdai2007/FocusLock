import type { Achievement, UserStats, SessionSummaryData, SessionConfig } from './types'

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_session',   name: 'First Flame',     description: 'Complete your first session',                    icon: '🔥', coinBonus: 25,  unlocked: false, unlockedAt: null },
  { id: 'streak_5',        name: 'Warming Up',       description: 'Hit a 5 minute focus streak',                   icon: '⏱️', coinBonus: 15,  unlocked: false, unlockedAt: null },
  { id: 'streak_15',       name: 'In The Zone',      description: 'Hit a 15 minute focus streak',                  icon: '⚡', coinBonus: 30,  unlocked: false, unlockedAt: null },
  { id: 'streak_30',       name: 'Locked In',        description: 'Hit a 30 minute focus streak',                  icon: '🔒', coinBonus: 50,  unlocked: false, unlockedAt: null },
  { id: 'streak_60',       name: 'Absolute Legend',  description: 'Hit a 60 minute focus streak',                  icon: '👑', coinBonus: 100, unlocked: false, unlockedAt: null },
  { id: 'perfect_session', name: 'Untouchable',      description: 'Complete a session with 0 lives lost',          icon: '💎', coinBonus: 40,  unlocked: false, unlockedAt: null },
  { id: 's_rank',          name: 'S-Rank Scholar',   description: 'Get an S rank (90%+ focus)',                    icon: '🏆', coinBonus: 50,  unlocked: false, unlockedAt: null },
  { id: 'comeback',        name: 'Comeback Kid',     description: 'Recover to 80+ focus after dropping below 50',  icon: '📈', coinBonus: 30,  unlocked: false, unlockedAt: null },
  { id: 'sessions_5',      name: 'Regular',          description: 'Complete 5 sessions',                           icon: '📚', coinBonus: 30,  unlocked: false, unlockedAt: null },
  { id: 'sessions_25',     name: 'Dedicated',        description: 'Complete 25 sessions',                          icon: '🎓', coinBonus: 75,  unlocked: false, unlockedAt: null },
  { id: 'coins_500',       name: 'Coin Collector',   description: 'Earn 500 total coins',                          icon: '🪙', coinBonus: 50,  unlocked: false, unlockedAt: null },
  { id: 'hard_mode',       name: 'Daredevil',        description: 'Complete a Hard mode session (1 life)',          icon: '💀', coinBonus: 60,  unlocked: false, unlockedAt: null },
  { id: 'day_streak_3',    name: 'Consistent',       description: '3 day usage streak',                            icon: '📅', coinBonus: 40,  unlocked: false, unlockedAt: null },
  { id: 'day_streak_7',    name: 'Weekly Warrior',   description: '7 day usage streak',                            icon: '🗓️', coinBonus: 100, unlocked: false, unlockedAt: null },
  { id: 'survivor',        name: 'Survivor',         description: 'Finish a session with exactly 1 life remaining', icon: '😅', coinBonus: 35, unlocked: false, unlockedAt: null },
]

export function getDefaultAchievements(): Achievement[] {
  return ALL_ACHIEVEMENTS.map((a) => ({ ...a }))
}

/** Merge stored achievements with the master list — handles newly added achievements and missing field on old persisted data */
export function mergeAchievements(existing: Achievement[] | undefined | null): Achievement[] {
  const safe = existing ?? []
  return ALL_ACHIEVEMENTS.map((def) => safe.find((e) => e.id === def.id) ?? { ...def })
}

function meetsCondition(
  id: string,
  stats: UserStats,
  summary: SessionSummaryData | null,
  config: SessionConfig | null,
): boolean {
  switch (id) {
    case 'first_session':   return stats.totalSessions >= 1
    case 'streak_5':        return (summary?.bestStreakMinutes ?? 0) >= 5
    case 'streak_15':       return (summary?.bestStreakMinutes ?? 0) >= 15
    case 'streak_30':       return (summary?.bestStreakMinutes ?? 0) >= 30
    case 'streak_60':       return (summary?.bestStreakMinutes ?? 0) >= 60
    case 'perfect_session': return summary?.livesLost === 0
    case 's_rank':          return (summary?.focusPercentage ?? 0) >= 90
    case 'comeback':        return summary?.hadComeback ?? false
    case 'sessions_5':      return stats.totalSessions >= 5
    case 'sessions_25':     return stats.totalSessions >= 25
    case 'coins_500':       return stats.totalCoins >= 500
    case 'hard_mode':       return config?.lives === 1 && summary !== null
    case 'day_streak_3':    return stats.dayStreak >= 3
    case 'day_streak_7':    return stats.dayStreak >= 7
    case 'survivor':        return summary?.livesRemaining === 1
    default:                return false
  }
}

/** Returns achievements that were locked and now meet their unlock condition */
export function checkAchievements(
  userStats: UserStats,
  summary: SessionSummaryData | null,
  config: SessionConfig | null,
): Achievement[] {
  return userStats.achievements.filter(
    (a) => !a.unlocked && meetsCondition(a.id, userStats, summary, config),
  )
}
