'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import FocusFlame from '@/components/flame/FocusFlame'
import WebcamCapture, { type WebcamHandle } from '@/components/webcam/WebcamCapture'
import ScanLines from '@/components/animations/ScanLines'
import Shockwave from '@/components/animations/Shockwave'
import TypewriterText from '@/components/roast/TypewriterText'
import { useFlameState } from '@/hooks/useFlameState'
import { useBackgroundSound } from '@/hooks/useBackgroundSound'
import { useSessionLoop } from '@/hooks/useSessionLoop'
import { calculateCoins } from '@/lib/focusEngine'
import { playClick } from '@/lib/sounds'
import { formatDuration, formatMMSS } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { useSettingsStore } from '@/stores/settingsStore'

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
  exit: { transition: { staggerChildren: 0.05 } },
}

const staggerChild = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: string
  label: string
  value: string
  colorClass: string
  /** Key that triggers the pop animation — defaults to value. Pass a stable key
   *  for live-updating values (e.g. streak) to avoid animating every second. */
  animateKey?: string
}

function StatCard({ icon, label, value, colorClass, animateKey }: StatCardProps) {
  return (
    <div className="flex w-28 flex-col items-center gap-1 rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-3 backdrop-blur-md">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {icon} {label}
      </p>
      <motion.p
        key={animateKey ?? value}
        className={`text-game text-base font-bold ${colorClass}`}
        initial={{ scale: 1.3, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
      >
        {value}
      </motion.p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SessionActive
// ---------------------------------------------------------------------------

export default function SessionActive() {
  const { session, latestRoast, isGameOver, pauseSession, resumeSession, endSession } =
    useSessionStore()

  const roastToastsEnabled = useSettingsStore((s) => s.roastToastsEnabled)

  const webcamRef = useRef<WebcamHandle>(null)
  useSessionLoop(webcamRef)
  useBackgroundSound()
  const { flameState, intensity } = useFlameState()

  const [now, setNow] = useState(Date.now())
  const [lostHeartIdx, setLostHeartIdx] = useState<number | null>(null)
  const [displayedRoast, setDisplayedRoast] = useState<{
    message: string
    status: string
  } | null>(null)

  const prevLivesRef = useRef<number>(session?.lives ?? 3)

  // 1-second tick for live timer + streak
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [])

  // Life-lost detection (heart shake animation only — flame is handled by useFlameState)
  useEffect(() => {
    if (!session) return

    const prevLives = prevLivesRef.current
    prevLivesRef.current = session.lives

    if (session.lives < prevLives) {
      setLostHeartIdx(session.lives)
      const t = setTimeout(() => setLostHeartIdx(null), 800)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.lives])

  // Game over → auto-end after 3s (extended for shockwave + enhanced animation)
  useEffect(() => {
    if (!isGameOver) return
    const t = setTimeout(() => endSession(), 3_000)
    return () => clearTimeout(t)
  }, [isGameOver, endSession])

  // Roast auto-dismiss after 8s
  useEffect(() => {
    if (!latestRoast) { setDisplayedRoast(null); return }
    setDisplayedRoast(latestRoast)
    const t = setTimeout(() => setDisplayedRoast(null), 8_000)
    return () => clearTimeout(t)
  }, [latestRoast])

  // Keyboard shortcuts: Space = pause/resume, Escape = end session
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName.toLowerCase()
      if (['input', 'textarea', 'select'].includes(tag) ||
          (e.target as HTMLElement).isContentEditable) return
      const { session: s, pauseSession: ps, resumeSession: rs, endSession: es } =
        useSessionStore.getState()
      if (!s) return
      if (e.code === 'Space') {
        e.preventDefault()
        s.isPaused ? rs() : ps()
      }
      if (e.code === 'Escape') {
        if (window.confirm('End this session?')) es()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const chartData = useMemo(() =>
    (session?.analysisHistory ?? []).map((e) => ({
      time: Math.round((e.timestamp - (session?.startTime ?? 0)) / 1000),
      score: e.score,
    })),
    [session?.analysisHistory, session?.startTime],
  )

  if (!session) return null

  // Derived values
  const remaining = Math.max(0, session.config.duration * 60 - (now - session.startTime) / 1000)

  const lastEvent = session.analysisHistory[session.analysisHistory.length - 1]
  const sinceLastAnalysis = lastEvent ? Math.max(0, (now - lastEvent.timestamp) / 1000) : 0
  const liveStreak =
    session.lastAnalysis?.status === 'focused'
      ? session.currentStreak + sinceLastAnalysis
      : session.currentStreak

  const liveCoins = calculateCoins(session)
  const focusScore = session.focusScore
  const focusColorClass =
    focusScore >= 70 ? 'text-green-400' : focusScore >= 40 ? 'text-amber-400' : 'text-red-400'

  const latestChartScore = chartData[chartData.length - 1]?.score ?? 60
  const areaStroke = latestChartScore > 50 ? '#4ade80' : '#f87171'

  const roastEmoji =
    displayedRoast?.status === 'focused' ? '🔥' : displayedRoast?.status === 'distracted' ? '📱' : '😴'

  const isPaused = session.isPaused

  return (
    <div className="fixed inset-0 flex flex-col items-center overflow-hidden bg-[#0a0a0a]">

      {/* Red shockwave ring on game over */}
      <Shockwave active={isGameOver} />

      {/* GAME OVER overlay */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.p
              className="text-game text-7xl font-bold tracking-widest text-red-500"
              style={{ textShadow: '0 0 40px rgba(239,68,68,0.6), 0 0 80px rgba(239,68,68,0.3)' }}
              initial={{ y: -200, opacity: 0, scale: 1.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.3 }}
            >
              GAME OVER
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PAUSE overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-game text-4xl font-bold tracking-widest text-zinc-400">PAUSED</p>
            <p className="mt-2 text-sm text-zinc-600">Press resume to continue</p>
            <button
              className="mt-6 rounded-xl border border-zinc-700 bg-zinc-800 px-8 py-3 text-game text-sm text-zinc-300 transition hover:bg-zinc-700"
              onClick={() => { playClick(); resumeSession() }}
            >
              ▶ Resume
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* MAIN CONTENT — stagger entrance/exit                               */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        className="flex w-full max-w-2xl flex-1 flex-col items-center justify-between py-3 px-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        exit="exit"
      >

        {/* ── Hearts + Timer ── */}
        <motion.div className="flex w-full items-center justify-between px-4" variants={staggerChild}>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: session.config.lives }).map((_, i) => {
              const alive = i < session.lives
              const isLost = i === lostHeartIdx
              return (
                <motion.div
                  key={i}
                  animate={
                    isLost
                      ? { scale: [1, 1.5, 1.5, 1], x: [0, -4, 4, -4, 4, -4, 0, 0] }
                      : alive
                      ? { scale: [1, 1.15, 1] }
                      : { scale: 1, x: 0 }
                  }
                  transition={
                    isLost
                      ? { duration: 0.55 }
                      : alive
                      ? { repeat: Infinity, duration: 1.2, delay: i * 0.15, ease: 'easeInOut' }
                      : { duration: 0.55 }
                  }
                >
                  <Heart
                    size={22}
                    className={
                      alive ? 'fill-red-500 text-red-500' : 'fill-zinc-800 text-zinc-700'
                    }
                  />
                </motion.div>
              )
            })}
          </div>

          <div className="text-center">
            <p className="text-game text-xl font-bold text-zinc-400">{formatMMSS(remaining)}</p>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">remaining</p>
          </div>
        </motion.div>

        {/* ── Stat cards + Flame ── */}

        {/* Desktop: 3-column layout */}
        <motion.div className="hidden items-center justify-center gap-4 sm:flex" variants={staggerChild}>
          <div className="flex flex-col gap-3">
            <StatCard icon="🔥" label="STREAK" value={formatDuration(liveStreak)} colorClass="text-amber-400" animateKey={String(session.currentStreak)} />
            <StatCard icon="🎯" label="FOCUS" value={`${focusScore}%`} colorClass={focusColorClass} />
          </div>
          <div style={{ transform: 'scale(0.82)', transformOrigin: 'center' }}>
            <FocusFlame state={flameState} intensity={intensity} streak={0} coins={0} />
          </div>
          <div className="flex flex-col gap-3">
            <StatCard icon="⚡" label="BEST" value={formatDuration(session.bestStreak)} colorClass="text-green-400" animateKey={String(session.bestStreak)} />
            <StatCard icon="🪙" label="COINS" value={`+${liveCoins}`} colorClass="text-yellow-400" />
          </div>
        </motion.div>

        {/* Mobile: flame on top, 2×2 grid below */}
        <motion.div className="flex flex-col items-center gap-3 sm:hidden" variants={staggerChild}>
          <div style={{ transform: 'scale(0.65)', transformOrigin: 'center' }}>
            <FocusFlame state={flameState} intensity={intensity} streak={0} coins={0} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon="🔥" label="STREAK" value={formatDuration(liveStreak)} colorClass="text-amber-400" animateKey={String(session.currentStreak)} />
            <StatCard icon="🎯" label="FOCUS" value={`${focusScore}%`} colorClass={focusColorClass} />
            <StatCard icon="⚡" label="BEST" value={formatDuration(session.bestStreak)} colorClass="text-green-400" animateKey={String(session.bestStreak)} />
            <StatCard icon="🪙" label="COINS" value={`+${liveCoins}`} colorClass="text-yellow-400" />
          </div>
        </motion.div>

        {/* ── Speech bubble ── */}
        <div className="flex h-16 items-center justify-center">
          <AnimatePresence mode="wait">
            {displayedRoast && roastToastsEnabled && (
              <motion.div
                key={displayedRoast.message}
                className="relative flex max-w-sm items-start gap-2 rounded-2xl bg-zinc-800/80 px-5 py-3 backdrop-blur-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                {/* Caret pointing up */}
                <div
                  className="absolute -top-2 left-1/2 h-0 w-0 -translate-x-1/2"
                  style={{
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderBottom: '8px solid rgba(39,39,42,0.8)',
                  }}
                />
                <span className="text-lg leading-snug">{roastEmoji}</span>
                <p className="text-sm italic text-zinc-200">
                  <TypewriterText text={displayedRoast.message} speed={25} />
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Webcam with CRT scan lines ── */}
        <motion.div className="relative shadow-[0_0_20px_rgba(0,0,0,0.5)]" variants={staggerChild}>
          <WebcamCapture ref={webcamRef} />
          <ScanLines />
        </motion.div>

        {/* ── Focus Timeline ── */}
        <motion.div className="glass-card w-full p-4" variants={staggerChild}>
          {chartData.length < 2 ? (
            <div className="flex h-[100px] items-center justify-center">
              <p className="text-sm italic text-zinc-600">Focus data will appear shortly...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#focusGrad)"
                  animationDuration={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* ── Controls ── */}
        <motion.div className="flex items-center gap-3 pb-1" variants={staggerChild}>
          <button
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 text-game text-sm text-zinc-300 transition hover:bg-zinc-700"
            onClick={() => { playClick(); isPaused ? resumeSession() : pauseSession() }}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            className="rounded-xl border border-red-800/60 bg-red-900/40 px-6 py-3 text-game text-sm text-red-400 transition hover:bg-red-900/60"
            onClick={() => {
              playClick()
              if (window.confirm('End this session?')) endSession()
            }}
          >
            End Session
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}
