'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { playClick } from '@/lib/sounds'
import { useSessionStore } from '@/stores/sessionStore'
import type { SavedSession } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGrade(pct: number): { letter: string; color: string } {
  if (pct >= 90) return { letter: 'S', color: 'text-yellow-400' }
  if (pct >= 80) return { letter: 'A', color: 'text-green-400' }
  if (pct >= 60) return { letter: 'B', color: 'text-amber-400' }
  return { letter: 'C', color: 'text-red-400' }
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

function formatDateShort(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatSessionDate(dateStr: string, timestamp: number): string {
  const todayStr = new Date().toISOString().slice(0, 10)
  const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const time = new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (dateStr === todayStr) return `Today ${time}`
  if (dateStr === yesterdayStr) return `Yesterday ${time}`
  return formatDateShort(dateStr)
}

const DISTRACTION_ICONS: Record<string, string> = {
  phone: '📱',
  sleeping: '😴',
  chatting: '💬',
  zoned_out: '😶‍🌫️',
  eating: '🍔',
  looking_away: '👀',
}

const DURATION_BUCKETS = ['0-15m', '15-30m', '30-45m', '45-60m', '60m+']

function getBucket(minutes: number): string {
  if (minutes < 15) return '0-15m'
  if (minutes < 30) return '15-30m'
  if (minutes < 45) return '30-45m'
  if (minutes < 60) return '45-60m'
  return '60m+'
}

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
}

function stagger(i: number) {
  return { duration: 0.4, ease: 'easeOut' as const, delay: i * 0.08 }
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      <p className="text-zinc-400">{label}</p>
      <p className="font-bold text-zinc-200">{payload[0].value}% focus</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AnalyticsDashboard
// ---------------------------------------------------------------------------

export default function AnalyticsDashboard() {
  const { userStats, returnToIdle } = useSessionStore()
  const sessions = userStats.sessions

  // ── Derived data ──
  const stats = useMemo(() => {
    if (sessions.length === 0) return null

    const now = Date.now()
    const weekAgo = now - 7 * 86_400_000
    const sessionsThisWeek = sessions.filter((s) => {
      const ts = Number(s.id)
      return !isNaN(ts) && ts > weekAgo
    }).length

    const totalMinutes = userStats.totalFocusMinutes
    const avgPerSession = sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0

    const avgFocus = Math.round(sessions.reduce((sum, s) => sum + s.summary.focusPercentage, 0) / sessions.length)

    // Trend: last 5 vs previous 5
    const recent5 = sessions.slice(0, 5)
    const prev5 = sessions.slice(5, 10)
    const recent5Avg = recent5.length > 0 ? recent5.reduce((s, x) => s + x.summary.focusPercentage, 0) / recent5.length : 0
    const prev5Avg = prev5.length > 0 ? prev5.reduce((s, x) => s + x.summary.focusPercentage, 0) / prev5.length : 0
    const trendUp = prev5.length > 0 ? recent5Avg >= prev5Avg : true

    // Best streak
    let bestStreak = 0
    let bestStreakDate = ''
    for (const s of sessions) {
      if (s.summary.bestStreakMinutes > bestStreak) {
        bestStreak = s.summary.bestStreakMinutes
        bestStreakDate = s.date
      }
    }
    const bestStreakMin = Math.floor(bestStreak)
    const bestStreakSec = Math.round((bestStreak - bestStreakMin) * 60)

    return { sessionsThisWeek, avgPerSession, avgFocus, trendUp, bestStreakMin, bestStreakSec, bestStreakDate }
  }, [sessions, userStats.totalFocusMinutes])

  // Focus over time chart data (chronological)
  const focusChartData = useMemo(() => {
    return [...sessions].reverse().map((s) => ({
      date: formatDateShort(s.date),
      focus: s.summary.focusPercentage,
      duration: s.summary.totalMinutes,
    }))
  }, [sessions])

  // Duration buckets
  const durationData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of DURATION_BUCKETS) counts[b] = 0
    for (const s of sessions) counts[getBucket(s.summary.totalMinutes)]++
    return DURATION_BUCKETS.map((b) => ({ bucket: b, count: counts[b] }))
  }, [sessions])

  // Distraction breakdown
  const distractionData = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const s of sessions) {
      for (const [type, count] of Object.entries(s.summary.distractionsByType)) {
        totals[type] = (totals[type] || 0) + count
      }
    }
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [sessions])

  const maxDistraction = distractionData.length > 0 ? distractionData[0][1] : 1

  // Best hours heatmap
  const hoursData = useMemo(() => {
    const hourBuckets: { total: number; count: number }[] = Array.from({ length: 24 }, () => ({ total: 0, count: 0 }))
    for (const s of sessions) {
      const ts = Number(s.id)
      if (isNaN(ts)) continue
      const hour = new Date(ts).getHours()
      hourBuckets[hour].total += s.summary.focusPercentage
      hourBuckets[hour].count++
    }
    return hourBuckets.map((b, h) => ({
      hour: h,
      avg: b.count > 0 ? Math.round(b.total / b.count) : -1,
      count: b.count,
    }))
  }, [sessions])

  // Streak calendar — last 12 weeks
  const calendarData = useMemo(() => {
    const sessionsByDate: Record<string, { best: number; count: number }> = {}
    for (const s of sessions) {
      const existing = sessionsByDate[s.date]
      if (existing) {
        existing.count++
        existing.best = Math.max(existing.best, s.summary.focusPercentage)
      } else {
        sessionsByDate[s.date] = { best: s.summary.focusPercentage, count: 1 }
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayOfWeek = today.getDay() // 0=Sun
    // Start from 12 weeks ago, aligned to start of that week (Sunday)
    const startOffset = dayOfWeek + 11 * 7
    const startDate = new Date(today.getTime() - startOffset * 86_400_000)

    const weeks: { date: Date; dateStr: string; data: { best: number; count: number } | null }[][] = []
    let current = new Date(startDate)

    for (let w = 0; w < 12; w++) {
      const week: typeof weeks[0] = []
      for (let d = 0; d < 7; d++) {
        const ds = current.toISOString().slice(0, 10)
        const isFuture = current > today
        week.push({
          date: new Date(current),
          dateStr: ds,
          data: isFuture ? null : (sessionsByDate[ds] || null),
        })
        current = new Date(current.getTime() + 86_400_000)
      }
      weeks.push(week)
    }

    return weeks
  }, [sessions])

  // ── Empty state ──
  if (sessions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <motion.div
          className="glass-card max-w-md p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-game text-lg text-zinc-400">📊 No data yet</p>
          <p className="mt-2 text-sm text-zinc-600">
            Complete your first study session to start tracking your analytics.
          </p>
          <button
            className="mt-6 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-3 text-game text-sm font-bold uppercase tracking-wider text-white"
            onClick={() => { playClick(); returnToIdle() }}
          >
            🔥 Start Session
          </button>
        </motion.div>
      </div>
    )
  }

  const focusColor = (pct: number) =>
    pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'

  function getHourColor(avg: number): string {
    if (avg < 0) return 'bg-zinc-800/30'
    if (avg < 50) return 'bg-red-500/30'
    if (avg < 70) return 'bg-amber-500/30'
    if (avg < 85) return 'bg-green-500/30'
    return 'bg-green-500/60'
  }

  function getCalendarColor(data: { best: number; count: number } | null): string {
    if (!data) return 'bg-zinc-800/30'
    const bright = data.count > 1
    if (data.best < 60) return bright ? 'bg-red-500/50' : 'bg-red-500/40'
    if (data.best < 80) return bright ? 'bg-amber-500/50' : 'bg-amber-500/40'
    return bright ? 'bg-green-500/60' : 'bg-green-500/50'
  }

  const HOUR_LABELS = [
    { h: 0, label: '12a' }, { h: 3, label: '3a' }, { h: 6, label: '6a' },
    { h: 9, label: '9a' }, { h: 12, label: '12p' }, { h: 15, label: '3p' },
    { h: 18, label: '6p' }, { h: 21, label: '9p' },
  ]

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  let cardIdx = 0

  return (
    <div className="min-h-screen bg-zinc-950 pb-12">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-950/90 px-6 py-4 backdrop-blur-sm">
        <button
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          onClick={() => { playClick(); returnToIdle() }}
        >
          ← Back
        </button>
        <h1 className="text-game text-xl font-bold text-zinc-200">📊 ANALYTICS</h1>
        <span className="rounded-full bg-zinc-800/60 px-3 py-1 text-[10px] text-zinc-500">All Time</span>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8 flex flex-col gap-6">
        {/* ── Hero Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Sessions */}
          <motion.div
            className="glass-card p-5"
            variants={cardVariants} initial="hidden" animate="visible"
            transition={stagger(cardIdx++)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📚</span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-600">Total Sessions</span>
            </div>
            <p className="text-game text-4xl font-bold text-zinc-100">{userStats.totalSessions}</p>
            {stats && stats.sessionsThisWeek > 0 && (
              <p className="mt-1 text-xs text-green-400">+{stats.sessionsThisWeek} this week</p>
            )}
          </motion.div>

          {/* Focus Time */}
          <motion.div
            className="glass-card p-5"
            variants={cardVariants} initial="hidden" animate="visible"
            transition={stagger(cardIdx++)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">⏱️</span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-600">Focus Time</span>
            </div>
            <p className="text-game text-4xl font-bold text-amber-400">{formatMinutes(userStats.totalFocusMinutes)}</p>
            {stats && (
              <p className="mt-1 text-xs text-zinc-500">~{stats.avgPerSession}m per session</p>
            )}
          </motion.div>

          {/* Avg Focus */}
          <motion.div
            className="glass-card p-5"
            variants={cardVariants} initial="hidden" animate="visible"
            transition={stagger(cardIdx++)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🎯</span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-600">Avg Focus</span>
            </div>
            <p className={`text-game text-4xl font-bold ${stats ? focusColor(stats.avgFocus) : 'text-zinc-100'}`}>
              {stats?.avgFocus ?? 0}%
            </p>
            {stats && (
              <p className={`mt-1 text-xs ${stats.trendUp ? 'text-green-400' : 'text-red-400'}`}>
                {stats.trendUp ? '↑ improving' : '↓ declining'}
              </p>
            )}
          </motion.div>

          {/* Best Streak */}
          <motion.div
            className="glass-card p-5"
            variants={cardVariants} initial="hidden" animate="visible"
            transition={stagger(cardIdx++)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">⚡</span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-600">Best Streak</span>
            </div>
            <p className="text-game text-4xl font-bold text-green-400">
              {stats ? `${stats.bestStreakMin}m${stats.bestStreakSec > 0 ? ` ${stats.bestStreakSec}s` : ''}` : '0m'}
            </p>
            {stats && stats.bestStreakDate && (
              <p className="mt-1 text-xs text-zinc-500">on {formatDateShort(stats.bestStreakDate)}</p>
            )}
          </motion.div>
        </div>

        {/* ── Focus Over Time ── */}
        <motion.div
          className="glass-card p-5 w-full"
          variants={cardVariants} initial="hidden" animate="visible"
          transition={stagger(cardIdx++)}
        >
          <p className="text-sm text-zinc-400 mb-4">Focus Score Over Time</p>
          {focusChartData.length < 2 ? (
            <p className="py-12 text-center text-sm italic text-zinc-600">
              Complete more sessions to see trends
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={focusChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.5)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
                <ReferenceLine y={70} stroke="rgba(34,197,94,0.3)" strokeDasharray="4 4" label={{ value: 'Good', position: 'right', fontSize: 9, fill: '#22c55e80' }} />
                <ReferenceLine y={40} stroke="rgba(239,68,68,0.3)" strokeDasharray="4 4" label={{ value: 'Poor', position: 'right', fontSize: 9, fill: '#ef444480' }} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="focus" stroke="#4ade80" strokeWidth={2} fill="url(#focusGrad)" dot={{ r: 3, fill: '#4ade80', strokeWidth: 0 }} animationDuration={800} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* ── Duration + Distractions row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session Duration Distribution */}
          <motion.div
            className="glass-card p-5"
            variants={cardVariants} initial="hidden" animate="visible"
            transition={stagger(cardIdx++)}
          >
            <p className="text-sm text-zinc-400 mb-4">Session Lengths</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={durationData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Bar dataKey="count" fill="rgba(245,158,11,0.6)" radius={[4, 4, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Distraction Breakdown */}
          <motion.div
            className="glass-card p-5"
            variants={cardVariants} initial="hidden" animate="visible"
            transition={stagger(cardIdx++)}
          >
            <p className="text-sm text-zinc-400 mb-4">Top Distractions</p>
            {distractionData.length === 0 ? (
              <p className="py-8 text-center text-sm italic text-zinc-600">
                No distractions tracked yet. Keep it up!
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {distractionData.map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-zinc-400 truncate">
                      {DISTRACTION_ICONS[type] || '❓'} {type.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 h-4 rounded-full bg-zinc-800/50 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-red-500/40"
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / maxDistraction) * 100}%` }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Hours Heatmap + Streak Calendar row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Focus Hours */}
          <motion.div
            className="glass-card p-5"
            variants={cardVariants} initial="hidden" animate="visible"
            transition={stagger(cardIdx++)}
          >
            <p className="text-sm text-zinc-400 mb-4">Best Focus Hours</p>
            <div className="flex flex-wrap gap-1">
              {hoursData.map((h) => (
                <div
                  key={h.hour}
                  className={`w-6 h-10 rounded-sm ${getHourColor(h.avg)} transition-colors`}
                  title={h.avg >= 0 ? `${h.hour}:00 — ${h.avg}% avg (${h.count} sessions)` : `${h.hour}:00 — no data`}
                />
              ))}
            </div>
            <div className="flex mt-1.5">
              {HOUR_LABELS.map((l) => (
                <span
                  key={l.h}
                  className="text-[8px] text-zinc-600"
                  style={{ width: `${(3 / 24) * 100}%` }}
                >
                  {l.label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Study Calendar */}
          <motion.div
            className="glass-card p-5"
            variants={cardVariants} initial="hidden" animate="visible"
            transition={stagger(cardIdx++)}
          >
            <p className="text-sm text-zinc-400 mb-4">Study Calendar</p>
            <div className="flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-1 mr-1">
                {DAY_LABELS.map((d, i) => (
                  <span
                    key={d}
                    className="text-[8px] text-zinc-600 h-4 flex items-center"
                    style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}
                  >
                    {d}
                  </span>
                ))}
              </div>
              {/* Week columns */}
              {calendarData.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={`w-4 h-4 rounded-sm ${getCalendarColor(day.data)} transition-colors`}
                      title={day.data ? `${day.dateStr}: ${day.data.best}% best (${day.data.count} session${day.data.count > 1 ? 's' : ''})` : day.dateStr}
                    />
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Recent Sessions Table ── */}
        <motion.div
          className="glass-card p-5 w-full"
          variants={cardVariants} initial="hidden" animate="visible"
          transition={stagger(cardIdx++)}
        >
          <p className="text-sm text-zinc-400 mb-4">Recent Sessions</p>
          <div className="max-h-[420px] overflow-y-auto thin-scroll">
            {sessions.slice(0, 15).map((s, i, arr) => {
              const { summary } = s
              const grade = getGrade(summary.focusPercentage)
              const totalLives = summary.livesRemaining + summary.livesLost
              const ts = Number(s.id)

              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 py-3 ${i < arr.length - 1 ? 'border-b border-zinc-800/30' : ''}`}
                >
                  {/* Date */}
                  <span className="w-28 shrink-0 text-sm text-zinc-400">
                    {formatSessionDate(s.date, isNaN(ts) ? 0 : ts)}
                  </span>

                  {/* Duration */}
                  <span className="text-sm text-zinc-400 w-14 shrink-0">{summary.totalMinutes}min</span>

                  {/* Focus % */}
                  <span className={`text-sm font-bold w-12 shrink-0 ${focusColor(summary.focusPercentage)}`}>
                    {summary.focusPercentage}%
                  </span>

                  {/* Grade */}
                  <span className={`text-game text-sm font-bold w-6 shrink-0 ${grade.color}`}>
                    {grade.letter}
                  </span>

                  {/* Hearts */}
                  <span className="flex gap-0.5 shrink-0">
                    {Array.from({ length: totalLives }).map((_, j) => (
                      <span
                        key={j}
                        className={j < summary.livesRemaining ? 'text-red-500' : 'text-zinc-700'}
                        style={{ fontSize: 10 }}
                      >
                        ❤
                      </span>
                    ))}
                  </span>

                  {/* Coins */}
                  <span className="ml-auto text-sm text-yellow-400/80 shrink-0">+{summary.coinsEarned} 🪙</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
