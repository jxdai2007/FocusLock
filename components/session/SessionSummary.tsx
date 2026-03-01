'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import AnimatedNumber from '@/components/animations/AnimatedNumber'
import ConfettiExplosion from '@/components/animations/ConfettiExplosion'
import SRankReveal from '@/components/animations/SRankReveal'
import { generateSessionReview } from '@/lib/gemini'
import { playClick, playCoinEarned, playConfetti, playTrombone } from '@/lib/sounds'
import { formatDuration, formatMMSS } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGrade(pct: number): { letter: string; color: string; glow: string } {
  if (pct >= 90) return { letter: 'S', color: 'text-yellow-400', glow: 'shadow-[0_0_30px_rgba(250,204,21,0.4)]' }
  if (pct >= 80) return { letter: 'A', color: 'text-green-400', glow: 'shadow-[0_0_30px_rgba(74,222,128,0.4)]' }
  if (pct >= 60) return { letter: 'B', color: 'text-amber-400', glow: 'shadow-[0_0_30px_rgba(251,191,36,0.4)]' }
  return { letter: 'C', color: 'text-red-400', glow: 'shadow-[0_0_30px_rgba(248,113,113,0.4)]' }
}

// ---------------------------------------------------------------------------
// SessionSummary
// ---------------------------------------------------------------------------

export default function SessionSummary() {
  const { sessionSummary, session, openSetup, returnToIdle, newlyUnlockedAchievements, clearNewAchievements } = useSessionStore()

  const [phase, setPhase] = useState<'entrance' | 'achievements' | 's-rank' | 'card'>('entrance')
  const [aiReview, setAiReview] = useState<string | null>(null)
  const [isShaking, setIsShaking] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const coinSoundPlayedRef = useRef(false)
  const gradeSoundPlayedRef = useRef(false)

  const isGameOver = (sessionSummary?.livesRemaining ?? 1) === 0
  const isSRank = (sessionSummary?.focusPercentage ?? 0) >= 90

  // Phase transition: entrance → achievements / s-rank / card
  useEffect(() => {
    const entranceDuration = isGameOver ? 3000 : 1500
    const t = setTimeout(() => {
      if (newlyUnlockedAchievements.length > 0) setPhase('achievements')
      else if (isSRank) setPhase('s-rank')
      else setPhase('card')
    }, entranceDuration)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameOver])

  // Auto-advance: achievements → s-rank or card
  useEffect(() => {
    if (phase !== 'achievements') return
    const duration = newlyUnlockedAchievements.length * 600 + 1200
    const t = setTimeout(() => {
      clearNewAchievements()
      setPhase(isSRank ? 's-rank' : 'card')
    }, duration)
    return () => clearTimeout(t)
  }, [phase, newlyUnlockedAchievements.length, clearNewAchievements, isSRank])

  // AI review (fire-and-forget on mount)
  useEffect(() => {
    if (!sessionSummary || !session) return
    generateSessionReview(sessionSummary, session.config).then(setAiReview)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Play coin sound once when card phase activates
  useEffect(() => {
    if (phase === 'card' && !coinSoundPlayedRef.current && (sessionSummary?.coinsEarned ?? 0) > 0) {
      const t = setTimeout(() => {
        playCoinEarned()
        coinSoundPlayedRef.current = true
      }, 800)
      return () => clearTimeout(t)
    }
  }, [phase, sessionSummary?.coinsEarned])

  // Grade-based celebration/failure effects — delayed 0.5s after card appears
  useEffect(() => {
    if (phase !== 'card' || gradeSoundPlayedRef.current) return
    const pct = sessionSummary?.focusPercentage ?? 0
    const t = setTimeout(() => {
      gradeSoundPlayedRef.current = true
      if (pct >= 80) {
        setShowConfetti(true)
        playConfetti()
      } else if (pct < 60) {
        playTrombone()
      }
    }, 500)
    return () => clearTimeout(t)
  }, [phase, sessionSummary?.focusPercentage])

  if (!sessionSummary || !session) return null

  const summary = sessionSummary
  const grade = getGrade(summary.focusPercentage)

  // Chart
  const chartData = summary.timeline.map((e) => ({
    time: Math.round((e.timestamp - session.startTime) / 1000),
    score: e.score,
  }))
  const latestChartScore = chartData[chartData.length - 1]?.score ?? 60
  const areaStroke = latestChartScore > 50 ? '#4ade80' : '#f87171'

  // Coins breakdown
  const focusedMinutes = Math.floor(session.totalFocusedTime / 60)
  const livesBonus = summary.livesRemaining * 5
  const focusBonus = summary.focusPercentage > 80 ? 10 : 0
  const perfectBonus = summary.livesLost === 0 ? 20 : 0

  const cardActive = phase === 'card'

  return (
    <motion.main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden px-4 py-12"
      animate={isShaking ? { x: [0, -2, 2, -2, 2, -1, 1, 0] } : {}}
      transition={isShaking ? { duration: 0.4, repeat: Infinity } : {}}
    >

      {/* ── Entrance sequence ── */}
      <AnimatePresence>
        {phase === 'entrance' && isGameOver && (
          <>
            {/* Red flash */}
            <motion.div
              key="red-flash"
              className="pointer-events-none fixed inset-0 z-10 bg-red-900"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ duration: 0.4 }}
            />
            {/* GAME OVER — drops from above */}
            <motion.p
              key="game-over-text"
              className="text-game absolute z-20 text-6xl font-bold text-red-500"
              style={{ textShadow: '0 0 40px rgba(239,68,68,0.6), 0 0 80px rgba(239,68,68,0.3)' }}
              initial={{ y: -200, opacity: 0, scale: 1.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.3 }}
            >
              GAME OVER
            </motion.p>
          </>
        )}

        {phase === 'entrance' && !isGameOver && (
          <motion.p
            key="session-complete-text"
            className="text-game absolute text-4xl font-bold text-amber-400"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
          >
            SESSION COMPLETE
          </motion.p>
        )}

        {phase === 'achievements' && (
          <motion.div
            key="achievements-phase"
            className="flex flex-col items-center gap-4 w-full max-w-sm"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-500/80 mb-2">
              🏆 Achievements Unlocked
            </p>
            {newlyUnlockedAchievements.map((a, i) => (
              <motion.div
                key={a.id}
                className="flex items-center gap-4 w-full rounded-2xl border-2 border-yellow-500/60 bg-zinc-900/90 px-6 py-4 shadow-[0_0_30px_rgba(250,204,21,0.2)] backdrop-blur-md"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22, delay: i * 0.5 }}
              >
                <span className="text-4xl">{a.icon}</span>
                <div className="flex-1">
                  <p className="text-game text-base font-bold text-zinc-100">{a.name}</p>
                  <p className="text-xs text-zinc-500">{a.description}</p>
                </div>
                <span className="text-sm font-bold text-yellow-400">+{a.coinBonus} 🪙</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── S-Rank meteor impact ── */}
      <SRankReveal
        active={phase === 's-rank'}
        onComplete={() => setPhase('card')}
        onShake={setIsShaking}
      />

      {/* ── Confetti (S/A rank) ── */}
      {showConfetti && (
        <ConfettiExplosion
          count={isSRank ? 70 : 40}
          includeStars={isSRank}
        />
      )}

      {/* ── C-rank vignette ── */}
      {phase === 'card' && grade.letter === 'C' && (
        <div
          className="pointer-events-none fixed inset-0 z-[40]"
          style={{ background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.3) 100%)' }}
        />
      )}

      {/* ── Summary card ── */}
      <AnimatePresence>
        {phase === 'card' && (
          <motion.div
            className="glass-card flex w-full max-w-md flex-col gap-6 p-8"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* 1. Grade */}
            <div className="text-center">
              {grade.letter === 'S' ? (
                /* S-rank: already revealed by meteor, continuous golden pulse */
                <motion.p
                  className={`text-game text-7xl font-bold ${grade.color}`}
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{
                    scale: 1,
                    textShadow: [
                      '0 0 20px rgba(250,204,21,0.4)',
                      '0 0 50px rgba(250,204,21,0.7)',
                      '0 0 20px rgba(250,204,21,0.4)',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {grade.letter}
                </motion.p>
              ) : grade.letter === 'C' ? (
                /* C-rank: scale up then shake */
                <motion.p
                  className={`text-game text-7xl font-bold ${grade.color} ${grade.glow}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1], x: [0, 0, 0, -3, 3, -3, 3, -2, 2, 0] }}
                  transition={{ duration: 0.8, times: [0, 0.3, 0.4, 0.5, 0.57, 0.64, 0.71, 0.78, 0.88, 1] }}
                >
                  {grade.letter}
                </motion.p>
              ) : (
                /* A/B rank: normal bounce */
                <motion.p
                  className={`text-game text-7xl font-bold ${grade.color} ${grade.glow}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ type: 'spring', stiffness: 260, damping: 15 }}
                >
                  {grade.letter}
                </motion.p>
              )}
              {/* Grade subtitle */}
              {grade.letter === 'A' && (
                <p className="text-xs text-green-400 italic mt-1">Impressive!</p>
              )}
              {grade.letter === 'B' && (
                <p className="text-xs text-zinc-500 italic mt-1">Not bad...</p>
              )}
            </div>

            {/* 2. Big stats row — AnimatedNumber */}
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="text-game text-2xl font-bold text-zinc-100">
                  {cardActive ? (
                    <><AnimatedNumber value={summary.totalMinutes} className="text-game text-2xl font-bold text-zinc-100" />m</>
                  ) : '0m'}
                </p>
                <p className="text-xs uppercase tracking-widest text-zinc-500">time</p>
              </div>
              <div className="h-10 w-px bg-zinc-700/50" />
              <div className="text-center">
                <p className="text-game text-2xl font-bold text-zinc-100">
                  {cardActive ? (
                    <><AnimatedNumber value={summary.focusPercentage} className="text-game text-2xl font-bold text-zinc-100" />%</>
                  ) : '0%'}
                </p>
                <p className="text-xs uppercase tracking-widest text-zinc-500">focus</p>
              </div>
              <div className="h-10 w-px bg-zinc-700/50" />
              <div className="text-center">
                <p className="text-game text-2xl font-bold text-zinc-100">
                  {formatDuration(session.bestStreak)}
                </p>
                <p className="text-xs uppercase tracking-widest text-zinc-500">best streak</p>
              </div>
            </div>

            {/* 3. Lives */}
            <div className="flex justify-center gap-1">
              {Array.from({ length: summary.livesRemaining + summary.livesLost }).map((_, i) => (
                <Heart
                  key={i}
                  size={20}
                  className={
                    i < summary.livesRemaining
                      ? 'fill-red-500 text-red-500'
                      : 'fill-zinc-800 text-zinc-700'
                  }
                />
              ))}
            </div>

            {/* 4. Coins — AnimatedNumber */}
            <div className="text-center">
              <p className="text-game text-3xl font-bold text-yellow-400">
                🪙 {cardActive ? (
                  <AnimatedNumber value={summary.coinsEarned} className="text-game text-3xl font-bold text-yellow-400" />
                ) : '0'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Base: +10 | Focus: +{focusedMinutes} | Lives: +{livesBonus}
                {focusBonus > 0 && ` | Bonus: +${focusBonus}`}
                {perfectBonus > 0 && ` | Perfect: +${perfectBonus}`}
              </p>
            </div>

            {/* 5. AI Review */}
            <div className="glass-card border-l-2 border-amber-500/50 p-4">
              {aiReview === null ? (
                <p className="animate-pulse text-sm text-zinc-500">Analyzing your session...</p>
              ) : (
                <p className="text-sm italic text-zinc-300">{aiReview}</p>
              )}
            </div>

            {/* 6. Focus Timeline */}
            {chartData.length >= 2 && (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="focusGradSummary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(63,63,70,0.5)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(v) => formatMMSS(v as number)}
                    tick={{ fill: '#52525b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 50, 100]}
                    tick={{ fill: '#52525b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={26}
                  />
                  <ReferenceLine
                    y={50}
                    stroke="#3f3f46"
                    strokeDasharray="3 3"
                    label={{ value: 'Focus Threshold', position: 'insideTopRight', fill: '#52525b', fontSize: 9 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '8px',
                      padding: '4px 10px',
                    }}
                    labelFormatter={(v) => formatMMSS(v as number)}
                    formatter={(v: number) => [v, 'Score']}
                    labelStyle={{ color: '#a1a1aa', fontSize: 11 }}
                    itemStyle={{ color: '#4ade80', fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={areaStroke}
                    strokeWidth={2}
                    fill="url(#focusGradSummary)"
                    animationDuration={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* 7. Action buttons */}
            <div className="flex justify-center gap-3">
              <motion.button
                className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-game text-sm font-bold text-white transition hover:brightness-110"
                whileTap={{ scale: 0.95 }}
                onClick={() => { playClick(); openSetup() }}
              >
                🔥 Go Again
              </motion.button>
              <motion.button
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 text-game text-sm text-zinc-400 transition hover:bg-zinc-700"
                whileTap={{ scale: 0.95 }}
                onClick={() => { playClick(); returnToIdle() }}
              >
                🏠 Home
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  )
}
