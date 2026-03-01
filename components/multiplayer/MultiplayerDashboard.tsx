'use client'

import { useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Heart } from 'lucide-react'
import { useMultiplayerStore } from '@/stores/multiplayerStore'
import { getSortedPlayers } from '@/lib/rooms'
import { playClick } from '@/lib/sounds'
import { formatDuration } from '@/lib/utils'
import type { RoomPlayer } from '@/lib/types'

// ---------------------------------------------------------------------------
// PlayerRow — single player in the sidebar list
// ---------------------------------------------------------------------------

interface PlayerRowProps {
  player: RoomPlayer
  rank: number
  isSelf: boolean
}

function PlayerRow({ player, rank, isSelf }: PlayerRowProps) {
  const prevScoreRef = useRef(player.focusScore)
  const scoreDrop = player.focusScore < prevScoreRef.current

  useEffect(() => {
    prevScoreRef.current = player.focusScore
  }, [player.focusScore])

  const statusColor =
    player.status === 'focused'
      ? 'bg-green-500'
      : player.status === 'distracted'
      ? 'bg-red-500'
      : player.status === 'away'
      ? 'bg-amber-500'
      : 'bg-zinc-600'

  const flameScale = Math.max(0.5, player.focusScore / 100)

  return (
    <motion.div
      layout
      layoutId={`player-${player.id}`}
      className={`relative flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
        isSelf
          ? 'border-amber-500/50 bg-amber-900/20'
          : 'border-zinc-800/50 bg-zinc-900/40'
      }`}
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: 1,
        x: 0,
        ...(scoreDrop ? { x: [0, -3, 3, -3, 0] } : {}),
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Rank */}
      <span className="text-sm font-bold text-zinc-500 w-5 shrink-0 text-center">
        {rank === 1 && player.status !== 'idle' ? (
          <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
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
        className="text-lg leading-none shrink-0"
        style={{ transform: `scale(${flameScale})`, transition: 'transform 0.3s ease' }}
      >
        🔥
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-game text-xs font-bold text-zinc-200 truncate">
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
// MultiplayerDashboard
// ---------------------------------------------------------------------------

interface MultiplayerDashboardProps {
  children: React.ReactNode
}

export default function MultiplayerDashboard({ children }: MultiplayerDashboardProps) {
  const { roomCode, playerId, room, leaveRoom } = useMultiplayerStore()

  const players = useMemo(() => getSortedPlayers(room), [room])

  const playerCount = players.length

  async function handleLeave() {
    if (window.confirm('Leave the study room?')) {
      playClick()
      await leaveRoom()
    }
  }

  return (
    <>
      {/* ── Left sidebar — desktop only, mirrors achievements panel position ── */}
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

      {/* ── Mobile top bar — compact, visible on small screens ── */}
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
              <span className="font-bold">{player.id === playerId ? 'YOU' : player.name.slice(0, 4)}</span>
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

      {/* ── Session content — unchanged, just rendered normally ── */}
      {children}
    </>
  )
}
