'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FocusFlame from '@/components/flame/FocusFlame'
import SessionActive from '@/components/session/SessionActive'
import SessionSetup from '@/components/session/SessionSetup'
import SessionSummary from '@/components/session/SessionSummary'
import MilestoneToast from '@/components/gamification/MilestoneToast'
import AchievementsPanel from '@/components/gamification/AchievementsPanel'
import InventoryPanel from '@/components/gamification/InventoryPanel'
import Shop from '@/components/gamification/Shop'
import RoomLobby from '@/components/multiplayer/RoomLobby'
import MultiplayerDashboard from '@/components/multiplayer/MultiplayerDashboard'
import SettingsButton from '@/components/settings/SettingsButton'
import SettingsPanel from '@/components/settings/SettingsPanel'
import EmberParticles from '@/components/animations/EmberParticles'
import { useFlameState } from '@/hooks/useFlameState'
import { playClick } from '@/lib/sounds'
import { useSessionStore } from '@/stores/sessionStore'
import { useMultiplayerStore } from '@/stores/multiplayerStore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFocusTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatSessionDate(dateStr: string): string {
  const todayStr = new Date().toISOString().slice(0, 10)
  const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (dateStr === todayStr) return 'Today'
  if (dateStr === yesterdayStr) return 'Yesterday'
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ---------------------------------------------------------------------------
// Ember particles (idle decorative)
// ---------------------------------------------------------------------------

const EMBER_PARTICLES = [
  { id: 1, left: 42, delay: 0.0, dur: 3.2 },
  { id: 2, left: 50, delay: 0.7, dur: 2.8 },
  { id: 3, left: 46, delay: 1.4, dur: 3.5 },
  { id: 4, left: 54, delay: 0.3, dur: 2.6 },
  { id: 5, left: 44, delay: 1.9, dur: 3.1 },
  { id: 6, left: 56, delay: 0.5, dur: 2.9 },
  { id: 7, left: 49, delay: 2.2, dur: 3.4 },
  { id: 8, left: 53, delay: 1.1, dur: 2.7 },
]

// ---------------------------------------------------------------------------
// Animation presets
// ---------------------------------------------------------------------------

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }
function delay(d: number) {
  return { duration: 0.45, ease: 'easeOut', delay: d } as const
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  const {
    appState,
    userStats,
    session,
    openSetup,
    startSession,
    returnToIdle,
  } = useSessionStore()

  const { flameState, intensity, streak, coins } = useFlameState()
  const { isInRoom } = useMultiplayerStore()

  const [showShop, setShowShop] = useState(false)
  const [showLobby, setShowLobby] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Ember burst on transitions (setup→active and summary→idle)
  const [showEmbers, setShowEmbers] = useState(false)
  useEffect(() => {
    if (appState === 'active' || appState === 'idle') {
      setShowEmbers(true)
      const t = setTimeout(() => setShowEmbers(false), 1500)
      return () => clearTimeout(t)
    }
  }, [appState])

  useEffect(() => {
    const status = session?.lastAnalysis?.status
    if (appState === 'active' || appState === 'paused') {
      const emoji = status === 'distracted' ? '🔴' : status === 'away' ? '🟡' : '🟢'
      const label = status === 'distracted' ? 'Distracted' : status === 'away' ? 'Away' : 'Focused'
      document.title = `${emoji} ${label} — FocusLock`
    } else {
      document.title = 'FocusLock 🔒'
    }
  }, [appState, session?.lastAnalysis?.status])

  return (
    <>
      {/* ── Ember burst particles for transitions ── */}
      <AnimatePresence>
        {showEmbers && (
          <motion.div
            key="embers"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <EmberParticles count={12} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page content — AnimatePresence mode="wait" ── */}
      <AnimatePresence mode="wait">
        {(appState === 'active' || appState === 'paused') && (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.3 }}
          >
            {isInRoom ? (
              <MultiplayerDashboard>
                <SessionActive />
              </MultiplayerDashboard>
            ) : (
              <SessionActive />
            )}
            <MilestoneToast />
          </motion.div>
        )}

        {appState === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.3 } }}
            transition={{ duration: 0.4 }}
          >
            <SessionSummary />
          </motion.div>
        )}

        {(appState === 'idle' || appState === 'setup') && (
          <motion.div
            key="idle"
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <div className="relative">
              {/* Achievements panel — pinned left on large screens */}
              <div className="hidden lg:flex fixed left-0 top-0 h-screen items-center pl-4 pointer-events-auto z-10">
                <AchievementsPanel />
              </div>

              {/* Inventory panel — pinned right on large screens */}
              <div className="hidden lg:flex fixed right-0 top-0 h-screen items-center pr-4 pointer-events-auto z-10">
                <InventoryPanel onOpenShop={() => setShowShop(true)} />
              </div>

            <main className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden px-4 py-12">

              {/* Ambient warm glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 50% 40%, rgba(245,158,11,0.06) 0%, transparent 60%)',
                }}
              />

              {/* Ember particles — behind flame */}
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                {EMBER_PARTICLES.map((p) => (
                  <span
                    key={p.id}
                    className="absolute h-1 w-1 rounded-full bg-orange-500"
                    style={{
                      left: `${p.left}%`,
                      bottom: '38%',
                      animationName: 'ember-rise',
                      animationDuration: `${p.dur}s`,
                      animationDelay: `${p.delay}s`,
                      animationTimingFunction: 'ease-out',
                      animationIterationCount: 'infinite',
                      opacity: 0,
                    }}
                  />
                ))}
              </div>

              {/* Header */}
              <motion.div
                className="mb-6 text-center"
                variants={fadeUp} initial="hidden" animate="visible"
                transition={delay(0)}
              >
                <h1 className="text-game text-3xl font-bold text-zinc-100">FOCUSLOCK 🔒</h1>
                <p className="mt-1 text-sm tracking-wider text-zinc-500">AI Study Accountability</p>
              </motion.div>

              {/* Flame — inline in page flow */}
              <motion.div
                variants={fadeUp} initial="hidden" animate="visible"
                transition={delay(0.1)}
              >
                <FocusFlame state={flameState} intensity={intensity} streak={streak} coins={coins} />
              </motion.div>

              {/* Streak + Coins */}
              <motion.div
                className="mt-4 flex items-center gap-6"
                variants={fadeUp} initial="hidden" animate="visible"
                transition={delay(0.2)}
              >
                {userStats.dayStreak > 0 ? (
                  <span className="text-game text-lg font-bold text-amber-400">
                    🔥 {userStats.dayStreak} day streak
                  </span>
                ) : (
                  <span className="text-game text-sm italic text-zinc-500">Start your streak!</span>
                )}
                <span className="text-game text-lg font-bold text-yellow-400">
                  🪙 {userStats.totalCoins}
                </span>
              </motion.div>

              {/* Start Session button */}
              <motion.button
                className="mt-6 w-72 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-4 text-game text-xl font-bold uppercase tracking-wider text-white shadow-[0_0_40px_rgba(245,158,11,0.3)] transition-all duration-200"
                variants={fadeUp} initial="hidden" animate="visible"
                transition={delay(0.3)}
                whileHover={{ scale: 1.03, filter: 'brightness(1.1)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { playClick(); openSetup() }}
              >
                🔥 Start Session
              </motion.button>

              {/* Shop + Study Room buttons */}
              <motion.div
                className="mt-3 flex w-72 gap-2"
                variants={fadeUp} initial="hidden" animate="visible"
                transition={delay(0.35)}
              >
                <motion.button
                  className="flex-1 rounded-xl border border-amber-600/50 bg-amber-900/30 py-3 text-game text-sm font-bold uppercase tracking-wider text-amber-400"
                  whileHover={{ scale: 1.03, filter: 'brightness(1.1)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { playClick(); setShowShop(true) }}
                >
                  🛒 Shop
                </motion.button>
                <motion.button
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/40 py-3 text-game text-sm font-bold uppercase tracking-wider text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { playClick(); setShowLobby(true) }}
                >
                  👥 Study Room
                </motion.button>
              </motion.div>

              {/* First-visit welcome card */}
              {userStats.totalSessions === 0 && (
                <motion.div
                  className="glass-card mt-8 mb-8 w-full max-w-lg px-6 py-8 text-center"
                  variants={fadeUp} initial="hidden" animate="visible"
                  transition={delay(0.4)}
                >
                  <p className="text-game mb-2 text-xl text-zinc-200">Welcome to FocusLock 🔒</p>
                  <p className="mb-6 text-sm text-zinc-500">
                    Your AI-powered study accountability partner. Start a session and let the flame
                    hold you accountable.
                  </p>
                  <div className="flex justify-center gap-10">
                    {[
                      { emoji: '🔥', label: 'AI Vision' },
                      { emoji: '❤️', label: 'Lives System' },
                      { emoji: '🪙', label: 'Earn Coins' },
                    ].map(({ emoji, label }) => (
                      <div key={label} className="text-center">
                        <p className="text-2xl">{emoji}</p>
                        <p className="mt-1 text-xs text-zinc-600">{label}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Lifetime stats + session history */}
              {userStats.totalSessions > 0 && (
                <>
                  {/* Stats bar */}
                  <motion.div
                    className="glass-card mt-8 w-full max-w-lg px-6 py-4"
                    variants={fadeUp} initial="hidden" animate="visible"
                    transition={delay(0.4)}
                  >
                    <p className="mb-3 text-xs uppercase tracking-widest text-zinc-500">📊 Your Stats</p>
                    <div className="flex items-center justify-around">
                      <div className="text-center">
                        <p className="text-game text-lg font-bold text-zinc-200">{userStats.totalSessions}</p>
                        <p className="text-xs text-zinc-500">sessions</p>
                      </div>
                      <div className="h-8 w-px bg-zinc-700/50" />
                      <div className="text-center">
                        <p className="text-game text-lg font-bold text-zinc-200">
                          {formatFocusTime(userStats.totalFocusMinutes)}
                        </p>
                        <p className="text-xs text-zinc-500">focused</p>
                      </div>
                      <div className="h-8 w-px bg-zinc-700/50" />
                      <div className="text-center">
                        <p className="text-game text-lg font-bold text-zinc-200">{userStats.totalCoins}</p>
                        <p className="text-xs text-zinc-500">coins earned</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Recent sessions */}
                  <motion.div
                    className="glass-card mb-8 mt-4 w-full max-w-lg px-6 py-4"
                    variants={fadeUp} initial="hidden" animate="visible"
                    transition={delay(0.5)}
                  >
                    <p className="mb-3 text-xs uppercase tracking-widest text-zinc-500">📜 Recent Sessions</p>
                    {userStats.sessions.length === 0 ? (
                      <p className="py-8 text-center text-sm italic text-zinc-600">
                        Complete your first session to see your history here
                      </p>
                    ) : (
                      <div>
                        {userStats.sessions.slice(0, 5).map((s, i, arr) => {
                          const { summary } = s
                          const totalLives = summary.livesRemaining + summary.livesLost
                          const focusColor =
                            summary.focusPercentage >= 70
                              ? 'text-green-400'
                              : summary.focusPercentage >= 40
                              ? 'text-amber-400'
                              : 'text-red-400'
                          return (
                            <div
                              key={s.id}
                              className={`flex items-center justify-between py-3 ${
                                i < arr.length - 1 ? 'border-b border-zinc-800/50' : ''
                              }`}
                            >
                              <span className="w-20 shrink-0 text-sm text-zinc-400">
                                {formatSessionDate(s.date)}
                              </span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-zinc-300">{summary.totalMinutes}min</span>
                                <span className={`text-sm font-bold ${focusColor}`}>
                                  {summary.focusPercentage}%
                                </span>
                                <span className="flex gap-0.5">
                                  {Array.from({ length: totalLives }).map((_, j) => (
                                    <span
                                      key={j}
                                      className={j < summary.livesRemaining ? 'text-red-500' : 'text-zinc-700'}
                                      style={{ fontSize: 11 }}
                                    >
                                      ❤
                                    </span>
                                  ))}
                                </span>
                              </div>
                              <span className="text-sm text-yellow-400/80">+{summary.coinsEarned} 🪙</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </motion.div>
                </>
              )}

              {/* Mobile achievements — below sessions history */}
              <motion.div
                className="lg:hidden w-full max-w-lg mt-4 mb-4"
                variants={fadeUp} initial="hidden" animate="visible" transition={delay(0.6)}
              >
                <AchievementsPanel />
              </motion.div>

              {/* Mobile inventory — below achievements */}
              <motion.div
                className="lg:hidden w-full max-w-lg mb-4"
                variants={fadeUp} initial="hidden" animate="visible" transition={delay(0.65)}
              >
                <InventoryPanel onOpenShop={() => setShowShop(true)} />
              </motion.div>

            </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Setup overlay — separate AnimatePresence (overlays idle, not in mode="wait") ── */}
      <AnimatePresence>
        {appState === 'setup' && (
          <SessionSetup onStart={startSession} onCancel={returnToIdle} />
        )}
      </AnimatePresence>

      {/* ── Shop modal ── */}
      <AnimatePresence>
        {showShop && <Shop onClose={() => setShowShop(false)} />}
      </AnimatePresence>

      {/* ── Room lobby modal ── */}
      <AnimatePresence>
        {showLobby && (
          <RoomLobby
            onClose={() => setShowLobby(false)}
            onRoomStart={() => { setShowLobby(false); openSetup() }}
          />
        )}
      </AnimatePresence>

      {/* ── Settings ── */}
      <SettingsButton onOpen={() => setShowSettings(true)} />
      <AnimatePresence>
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </>
  )
}
