'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Heart } from 'lucide-react'
import { useMultiplayerStore } from '@/stores/multiplayerStore'
import { getSortedPlayers } from '@/lib/rooms'
import { getTheme } from '@/lib/themes'
import { playClick } from '@/lib/sounds'
import { formatDuration } from '@/lib/utils'
import type { RoomPlayer } from '@/lib/types'

// ---------------------------------------------------------------------------
// Animation types
// ---------------------------------------------------------------------------

interface PlayerAnimState {
  borderFlash: 'green' | 'red' | 'gold' | null
  scoreDelta: number | null
  showDistractRipple: boolean
  showFlameSwap: boolean
  crownSuppressed: boolean
  crownLand: boolean
}

interface CrownFlight {
  fromX: number
  fromY: number
  toX: number
  toY: number
}

const EMPTY_ANIM: PlayerAnimState = {
  borderFlash: null,
  scoreDelta: null,
  showDistractRipple: false,
  showFlameSwap: false,
  crownSuppressed: false,
  crownLand: false,
}

// ---------------------------------------------------------------------------
// PlayerRow
// ---------------------------------------------------------------------------

interface PlayerRowProps {
  player: RoomPlayer
  rank: number
  isSelf: boolean
  anim: PlayerAnimState
  cardRef: (el: HTMLDivElement | null) => void
}

function PlayerRow({ player, rank, isSelf, anim, cardRef }: PlayerRowProps) {
  const statusColor =
    player.status === 'focused'
      ? 'bg-green-500'
      : player.status === 'distracted'
        ? 'bg-red-500'
        : player.status === 'away'
          ? 'bg-amber-500'
          : 'bg-zinc-600'

  const flameScale = Math.max(0.5, player.focusScore / 100)
  const playerTheme = getTheme(player.theme ?? 'classic')
  const isLegendary = playerTheme.rarity === 'legendary'

  const borderClass =
    anim.borderFlash === 'green'
      ? 'border-green-400/60'
      : anim.borderFlash === 'red'
        ? 'border-red-400/40'
        : anim.borderFlash === 'gold'
          ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
          : isSelf
            ? 'border-amber-500/50'
            : 'border-zinc-800/50'

  const bgClass = isSelf ? 'bg-amber-900/20' : 'bg-zinc-900/40'
  const showCrown = rank === 1 && player.status !== 'idle' && !anim.crownSuppressed

  return (
    <motion.div
      ref={cardRef}
      layout
      layoutId={`player-${player.id}`}
      className={`relative flex items-center gap-3 rounded-xl border px-3 py-3 ${borderClass} ${bgClass}`}
      style={{ transition: 'border-color 0.3s ease, box-shadow 0.3s ease' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 } }}
    >
      {/* Distraction ripple */}
      <AnimatePresence>
        {anim.showDistractRipple && (
          <motion.div
            key="ripple"
            className="absolute inset-0 rounded-xl border-2 border-red-500 pointer-events-none"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Score delta indicator */}
      <AnimatePresence>
        {anim.scoreDelta !== null && (
          <motion.span
            key={`delta-${anim.scoreDelta}`}
            className={`absolute -top-1 left-1/2 -translate-x-1/2 text-game text-xs font-bold pointer-events-none ${
              anim.scoreDelta > 0 ? 'text-green-400' : 'text-red-400'
            }`}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: anim.scoreDelta > 0 ? -30 : 15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {anim.scoreDelta > 0 ? '+' : ''}
            {anim.scoreDelta}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Rank */}
      <span className="text-sm font-bold text-zinc-500 w-5 shrink-0 text-center">
        {showCrown ? (
          <motion.span
            animate={
              anim.crownLand ? { scale: [1.5, 1] } : { scale: [1, 1.15, 1] }
            }
            transition={
              anim.crownLand
                ? { type: 'spring', stiffness: 400, damping: 15 }
                : { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
            }
            className="inline-block"
          >
            👑
          </motion.span>
        ) : (
          `#${rank}`
        )}
      </span>

      {/* Flame */}
      <div
        className="text-lg leading-none shrink-0 rounded-full"
        style={{
          transform: `scale(${flameScale})`,
          transition: 'transform 0.3s ease',
          filter: player.status !== 'idle' ? `drop-shadow(0 0 6px ${playerTheme.colors.glow})` : 'none',
        }}
      >
        {anim.showFlameSwap ? '\u{1F4A8}' : '\u{1F525}'}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-game text-xs font-bold text-zinc-200 truncate">
          {isLegendary && <span className="mr-0.5">👑</span>}
          {isSelf ? 'YOU' : player.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
          {player.currentStreak > 0 && (
            <span className="text-[9px] text-amber-400/80">
              {formatDuration(player.currentStreak)} streak
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      <motion.span
        key={player.focusScore}
        className="text-game text-sm font-bold text-zinc-100 shrink-0"
        initial={{ scale: 1.3, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
      >
        {player.focusScore}%
      </motion.span>

      {/* Hearts */}
      {player.livesTotal > 0 && (
        <div className="flex gap-0.5 shrink-0">
          {Array.from({ length: player.livesTotal }).map((_, i) => (
            <Heart
              key={i}
              size={10}
              className={
                i < player.lives ? 'fill-red-500 text-red-500' : 'fill-zinc-800 text-zinc-700'
              }
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// FlyingCrown — fixed-position overlay for crown transfer
// ---------------------------------------------------------------------------

interface FlyingCrownProps {
  flight: CrownFlight
  onComplete: () => void
}

function FlyingCrown({ flight, onComplete }: FlyingCrownProps) {
  const { fromX, fromY, toX, toY } = flight
  const midX = (fromX + toX) / 2
  const midY = Math.min(fromY, toY) - 60

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      {/* Trail sparkles */}
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="fixed text-yellow-400/60 text-xs"
          style={{ left: fromX, top: fromY }}
          initial={{ opacity: 0.6, scale: 0.5 }}
          animate={{
            x: [0, midX - fromX, toX - fromX],
            y: [0, midY - fromY, toY - fromY],
            opacity: [0.6, 0.4, 0],
            scale: [0.5, 0.3, 0],
          }}
          transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeInOut' }}
        >
          ✨
        </motion.span>
      ))}

      {/* Flying crown */}
      <motion.span
        className="fixed text-sm"
        style={{ left: fromX, top: fromY }}
        initial={{ scale: 1.5 }}
        animate={{
          x: [0, midX - fromX, toX - fromX],
          y: [0, midY - fromY, toY - fromY],
          scale: [1.5, 2, 1.5],
          rotate: [0, 15, -15, 0],
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        onAnimationComplete={onComplete}
      >
        👑
      </motion.span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MultiplayerDashboard
// ---------------------------------------------------------------------------

interface MultiplayerDashboardProps {
  children: React.ReactNode
}

export default function MultiplayerDashboard({ children }: MultiplayerDashboardProps) {
  const { roomCode, playerId, room, leaveRoom } = useMultiplayerStore()
  const players = useMemo(() => getSortedPlayers(room), [room])
  const playerCount = players.length

  // Keep latest players in a ref so the 2s interval always reads fresh data
  const latestPlayersRef = useRef<RoomPlayer[]>([])
  latestPlayersRef.current = players

  // Tracking refs for previous state (updated only inside the 2s comparison)
  const prevLeaderRef = useRef<string | null>(null)
  const prevRankingsRef = useRef<string[]>([])
  const prevScoresRef = useRef<Record<string, number>>({})
  const prevStatusRef = useRef<Record<string, string>>({})
  const crownFlightActiveRef = useRef(false)
  const crownToRef = useRef<string | null>(null)

  // Card DOM refs for position tracking
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())
  const cardRefCallbacks = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map())

  // Animation state
  const [animStates, setAnimStates] = useState<Record<string, PlayerAnimState>>({})
  const [crownFlight, setCrownFlight] = useState<CrownFlight | null>(null)
  crownFlightActiveRef.current = crownFlight !== null

  const getCardRef = useCallback((id: string) => {
    let cb = cardRefCallbacks.current.get(id)
    if (!cb) {
      cb = (el: HTMLDivElement | null) => {
        if (el) cardRefsMap.current.set(id, el)
        else cardRefsMap.current.delete(id)
      }
      cardRefCallbacks.current.set(id, cb)
    }
    return cb
  }, [])

  // Crown flight complete → land crown on new leader
  const handleCrownFlightComplete = useCallback(() => {
    setCrownFlight(null)
    const toId = crownToRef.current
    if (!toId) return

    // Show crown landing with bounce + gold flash
    setAnimStates((prev) => ({
      ...prev,
      [toId]: {
        ...(prev[toId] ?? EMPTY_ANIM),
        crownSuppressed: false,
        crownLand: true,
        borderFlash: 'gold',
      },
    }))

    // Clear landing effects after 0.5s
    setTimeout(() => {
      setAnimStates((prev) => ({
        ...prev,
        [toId]: { ...EMPTY_ANIM },
      }))
      crownToRef.current = null
    }, 500)
  }, [])

  // Debounced comparison — runs every 2s to detect ranking/score/status changes
  useEffect(() => {
    const interval = setInterval(() => {
      const currentPlayers = latestPlayersRef.current
      if (currentPlayers.length === 0) return

      const newRankings = currentPlayers.map((p) => p.id)
      const newScores: Record<string, number> = {}
      const newStatuses: Record<string, string> = {}
      for (const p of currentPlayers) {
        newScores[p.id] = p.focusScore
        newStatuses[p.id] = p.status
      }

      const prevRankings = prevRankingsRef.current
      const prevScores = prevScoresRef.current
      const prevStatuses = prevStatusRef.current

      // First cycle — just capture baseline, no animations
      if (prevRankings.length === 0) {
        prevRankingsRef.current = newRankings
        prevScoresRef.current = newScores
        prevStatusRef.current = newStatuses
        prevLeaderRef.current = newRankings[0] ?? null
        return
      }

      const updates: Record<string, Partial<PlayerAnimState>> = {}
      let crownTransferTriggered = false

      // ── 1. Crown transfer ──
      const newLeader = newRankings[0]
      const oldLeader = prevLeaderRef.current
      if (
        newLeader &&
        oldLeader &&
        newLeader !== oldLeader &&
        !crownFlightActiveRef.current
      ) {
        const fromEl = cardRefsMap.current.get(oldLeader)
        const toEl = cardRefsMap.current.get(newLeader)
        if (fromEl && toEl) {
          const fromRect = fromEl.getBoundingClientRect()
          const toRect = toEl.getBoundingClientRect()
          crownToRef.current = newLeader
          setCrownFlight({
            fromX: fromRect.left + 12,
            fromY: fromRect.top - 4,
            toX: toRect.left + 12,
            toY: toRect.top - 4,
          })
          // Suppress crown on new leader until flight completes
          updates[newLeader] = { ...updates[newLeader], crownSuppressed: true }
          crownTransferTriggered = true
        }
      }

      // ── 2. Overtake flash (skip if crown transfer to avoid visual chaos) ──
      if (!crownTransferTriggered) {
        for (let i = 0; i < newRankings.length; i++) {
          const id = newRankings[i]
          const prevIndex = prevRankings.indexOf(id)
          if (prevIndex === -1) continue
          if (i < prevIndex) {
            updates[id] = { ...updates[id], borderFlash: 'green' }
          } else if (i > prevIndex) {
            updates[id] = { ...updates[id], borderFlash: 'red' }
          }
        }
      }

      // ── 3. Score deltas (±10 threshold) ──
      for (const id of newRankings) {
        const prev = prevScores[id]
        const curr = newScores[id]
        if (prev !== undefined && Math.abs(curr - prev) >= 10) {
          updates[id] = { ...updates[id], scoreDelta: curr - prev }
        }
      }

      // ── 4. Distraction ripple ──
      for (const id of newRankings) {
        if (newStatuses[id] === 'distracted' && prevStatuses[id] !== 'distracted') {
          updates[id] = { ...updates[id], showDistractRipple: true, showFlameSwap: true }
        }
      }

      // Apply animation updates
      if (Object.keys(updates).length > 0) {
        setAnimStates((prev) => {
          const next = { ...prev }
          for (const [id, partial] of Object.entries(updates)) {
            next[id] = { ...(next[id] ?? EMPTY_ANIM), ...partial }
          }
          return next
        })

        // Clear flame swap after 0.5s
        setTimeout(() => {
          setAnimStates((prev) => {
            const next = { ...prev }
            for (const [id, partial] of Object.entries(updates)) {
              if (partial.showFlameSwap && next[id]) {
                next[id] = { ...next[id], showFlameSwap: false }
              }
            }
            return next
          })
        }, 500)

        // Clear border flash, score delta, distraction ripple after 0.8s
        setTimeout(() => {
          setAnimStates((prev) => {
            const next = { ...prev }
            for (const id of Object.keys(updates)) {
              const existing = next[id]
              if (!existing) continue
              next[id] = {
                ...existing,
                // Keep gold flash — cleared by crown landing callback
                borderFlash: existing.borderFlash === 'gold' ? 'gold' : null,
                scoreDelta: null,
                showDistractRipple: false,
              }
            }
            return next
          })
        }, 800)
      }

      // Update prev refs for next comparison
      prevRankingsRef.current = newRankings
      prevScoresRef.current = newScores
      prevStatusRef.current = newStatuses
      prevLeaderRef.current = newLeader ?? null
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  async function handleLeave() {
    if (window.confirm('Leave the study room?')) {
      playClick()
      await leaveRoom()
    }
  }

  return (
    <>
      {/* ── Flying crown portal ── */}
      <AnimatePresence>
        {crownFlight && (
          <FlyingCrown
            key="crown-flight"
            flight={crownFlight}
            onComplete={handleCrownFlightComplete}
          />
        )}
      </AnimatePresence>

      {/* ── Left sidebar — desktop only ── */}
      <div className="hidden lg:flex fixed left-0 top-0 h-screen items-center pl-4 z-30">
        <div className="glass-card w-64 h-[calc(100vh-2rem)] flex flex-col p-4">
          {/* Room code header */}
          <div className="text-center mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
              Study Room
            </p>
            <div className="flex justify-center gap-1">
              {roomCode?.split('').map((char, i) => (
                <div
                  key={i}
                  className="flex h-8 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/60"
                >
                  <span className="text-game text-sm font-bold text-amber-400">{char}</span>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-zinc-600">
              {playerCount} player{playerCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Player list */}
          <div className="flex-1 overflow-y-auto thin-scroll">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
              Leaderboard
            </p>
            <LayoutGroup>
              <div className="flex flex-col gap-2">
                <AnimatePresence>
                  {players.map((player, i) => (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      rank={i + 1}
                      isSelf={player.id === playerId}
                      anim={animStates[player.id] ?? EMPTY_ANIM}
                      cardRef={getCardRef(player.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </LayoutGroup>
          </div>

          {/* Leave button */}
          <button
            onClick={handleLeave}
            className="mt-3 w-full rounded-lg border border-red-800/40 bg-red-900/20 py-2 text-game text-[10px] font-bold uppercase tracking-wider text-red-400/70 hover:text-red-400 hover:bg-red-900/30 transition"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* ── Mobile top bar — compact ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2 border-b border-zinc-800/50 bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-game text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Room
          </span>
          <span className="text-game text-xs font-bold text-amber-400 tracking-widest">
            {roomCode}
          </span>
          <span className="text-[9px] text-zinc-600">
            {playerCount}p
          </span>
        </div>
        {/* Compact player scores */}
        <div className="flex items-center gap-1.5">
          {players.slice(0, 4).map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] ${
                player.id === playerId
                  ? 'bg-amber-900/30 text-amber-400'
                  : 'bg-zinc-800/60 text-zinc-400'
              }`}
            >
              {i === 0 && player.status !== 'idle' && <span>👑</span>}
              <span className="font-bold">
                {player.id === playerId ? 'YOU' : player.name.slice(0, 4)}
              </span>
              <span>{player.focusScore}%</span>
            </div>
          ))}
        </div>
        <button
          onClick={handleLeave}
          className="text-game text-[9px] font-bold uppercase text-red-400/70 hover:text-red-400 transition"
        >
          Leave
        </button>
      </div>

      {/* ── Session content ── */}
      {children}
    </>
  )
}
