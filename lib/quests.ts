import type { Quest, SessionConfig, SessionSummaryData, UserStats } from './types'

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ''

// ---------------------------------------------------------------------------
// Generate quests via Gemini
// ---------------------------------------------------------------------------

export async function generateQuests(userStats: UserStats): Promise<Quest[]> {
  const sessions = userStats.sessions
  const avgFocus =
    sessions.length > 0
      ? Math.round(sessions.reduce((s, x) => s + x.summary.focusPercentage, 0) / sessions.length)
      : 50
  const avgDuration =
    sessions.length > 0
      ? Math.round(sessions.reduce((s, x) => s + x.summary.totalMinutes, 0) / sessions.length)
      : 15
  const bestStreak =
    sessions.length > 0
      ? Math.round(Math.max(...sessions.map((s) => s.summary.bestStreakMinutes)))
      : 5

  // Find top distraction
  const distractionTotals: Record<string, number> = {}
  for (const s of sessions) {
    for (const [type, count] of Object.entries(s.summary.distractionsByType)) {
      distractionTotals[type] = (distractionTotals[type] || 0) + count
    }
  }
  const topDistraction =
    Object.entries(distractionTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none'

  const prompt = `You are generating 3 daily study challenges for a FocusLock user.

User stats:
- Total sessions: ${userStats.totalSessions}
- Average focus: ${avgFocus}%
- Best streak ever: ${bestStreak} minutes
- Average session length: ${avgDuration} minutes
- Most common distraction: ${topDistraction}
- Day streak: ${userStats.dayStreak} days
- Total coins: ${userStats.totalCoins}

Generate exactly 3 challenges calibrated to their skill level:
1. One EASY challenge (slightly above their average, achievable today)
2. One MEDIUM challenge (a stretch goal, pushes them)
3. One HARD challenge (ambitious, rewards big)

Each challenge must be measurable from session data: focus percentage, streak duration, session length, lives remaining, or distraction count.

Respond ONLY with valid JSON array:
[
  {
    "title": "short catchy name, 3-5 words",
    "description": "one sentence explaining the challenge",
    "condition": "one of: focus_above_X, streak_minutes_X, session_duration_X, no_lives_lost, max_distractions_X, hard_mode_complete",
    "reward": number between 20-150 (easy 20-40, medium 50-80, hard 100-150),
    "difficulty": "easy|medium|hard",
    "icon": "single relevant emoji"
  }
]

Make challenges fun and specific to the user. If they average ${avgFocus}% focus, don't ask for 95%. If their best streak is ${bestStreak} min, challenge them to hit ${bestStreak + 2}.
Reference their actual stats to make it feel personal.`

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
      }),
    })

    if (!res.ok) {
      console.error('[quests] HTTP error:', res.status)
      return getFallbackQuests(avgFocus, bestStreak, avgDuration)
    }

    const data = await res.json()
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return getFallbackQuests(avgFocus, bestStreak, avgDuration)

    const parsed = JSON.parse(text) as Array<{
      title: string
      description: string
      condition: string
      reward: number
      difficulty: 'easy' | 'medium' | 'hard'
      icon: string
    }>

    const today = new Date().toISOString().slice(0, 10)
    return parsed.map((q) => ({
      ...q,
      id: Math.random().toString(36).slice(2, 10),
      completed: false,
      generatedAt: today,
    }))
  } catch (err) {
    console.error('[quests] generation error:', err)
    return getFallbackQuests(avgFocus, bestStreak, avgDuration)
  }
}

// ---------------------------------------------------------------------------
// Fallback quests if Gemini fails
// ---------------------------------------------------------------------------

function getFallbackQuests(avgFocus: number, bestStreak: number, avgDuration: number): Quest[] {
  const today = new Date().toISOString().slice(0, 10)
  return [
    {
      id: Math.random().toString(36).slice(2, 10),
      title: 'Stay Sharp',
      description: `Score above ${Math.min(avgFocus + 5, 95)}% focus in a session`,
      condition: `focus_above_${Math.min(avgFocus + 5, 95)}`,
      reward: 30,
      difficulty: 'easy',
      icon: '🎯',
      completed: false,
      generatedAt: today,
    },
    {
      id: Math.random().toString(36).slice(2, 10),
      title: 'Streak Hunter',
      description: `Maintain a ${bestStreak + 3} minute focus streak`,
      condition: `streak_minutes_${bestStreak + 3}`,
      reward: 60,
      difficulty: 'medium',
      icon: '⚡',
      completed: false,
      generatedAt: today,
    },
    {
      id: Math.random().toString(36).slice(2, 10),
      title: 'Iron Will',
      description: 'Complete a session without losing any lives',
      condition: 'no_lives_lost',
      reward: 120,
      difficulty: 'hard',
      icon: '🛡️',
      completed: false,
      generatedAt: today,
    },
  ]
}

// ---------------------------------------------------------------------------
// Check quest completion
// ---------------------------------------------------------------------------

export function checkQuestCompletion(
  quest: Quest,
  summary: SessionSummaryData,
  config: SessionConfig,
): boolean {
  if (quest.completed) return false

  const condition = quest.condition

  // focus_above_X
  const focusMatch = condition.match(/^focus_above_(\d+)$/)
  if (focusMatch) return summary.focusPercentage >= Number(focusMatch[1])

  // streak_minutes_X
  const streakMatch = condition.match(/^streak_minutes_(\d+)$/)
  if (streakMatch) return summary.bestStreakMinutes >= Number(streakMatch[1])

  // session_duration_X
  const durationMatch = condition.match(/^session_duration_(\d+)$/)
  if (durationMatch) return summary.totalMinutes >= Number(durationMatch[1])

  // no_lives_lost
  if (condition === 'no_lives_lost') return summary.livesLost === 0

  // max_distractions_X
  const distractMatch = condition.match(/^max_distractions_(\d+)$/)
  if (distractMatch) {
    const total = Object.values(summary.distractionsByType).reduce((s, n) => s + n, 0)
    return total <= Number(distractMatch[1])
  }

  // hard_mode_complete
  if (condition === 'hard_mode_complete') {
    return config.lives === 1 && summary.livesRemaining > 0
  }

  return false
}
