'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playClick } from '@/lib/sounds'
import { useMultiplayerStore } from '@/stores/multiplayerStore'
import { database, ref, update } from '@/lib/firebase'

interface RoomLobbyProps {
  onClose: () => void
  onRoomStart: () => void
}

export default function RoomLobby({ onClose, onRoomStart }: RoomLobbyProps) {
  const {
    roomCode,
    playerId,
    room,
    isHost,
    isInRoom,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    clearError,
  } = useMultiplayerStore()

  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [joinDigits, setJoinDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const joinInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Watch for room becoming active (host clicked START)
  useEffect(() => {
    if (room?.isActive) {
      onRoomStart()
    }
  }, [room?.isActive, onRoomStart])

  async function handleClose() {
    if (isInRoom) {
      await leaveRoom()
    }
    onClose()
  }

  async function handleCreate() {
    if (!name.trim()) return
    setIsLoading(true)
    await createRoom(name.trim())
    setIsLoading(false)
  }

  async function handleJoin() {
    const code = joinDigits.join('')
    if (!name.trim() || code.length < 6) return
    setIsLoading(true)
    clearError()
    await joinRoom(code.toUpperCase(), name.trim())
    setIsLoading(false)
  }

  function handleJoinDigitChange(index: number, value: string) {
    const char = value.slice(-1).toUpperCase()
    if (char && !/[A-Z0-9]/.test(char)) return

    const next = [...joinDigits]
    next[index] = char
    setJoinDigits(next)

    if (char && index < 5) {
      joinInputRefs.current[index + 1]?.focus()
    }
  }

  function handleJoinKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !joinDigits[index] && index > 0) {
      joinInputRefs.current[index - 1]?.focus()
    }
  }

  function handleJoinPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    const next = [...joinDigits]
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || ''
    }
    setJoinDigits(next)
    const focusIdx = Math.min(pasted.length, 5)
    joinInputRefs.current[focusIdx]?.focus()
  }

  async function handleCopy() {
    if (!roomCode) return
    await navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleStartTogether() {
    if (!roomCode) return
    await update(ref(database, `rooms/${roomCode}`), { isActive: true })
  }

  const players = room?.players ? Object.values(room.players) : []
  const canStart = isHost && players.length >= 2
  const joinCode = joinDigits.join('')

  // ── Lobby view (after create/join) ──
  const renderLobbyView = () => (
    <div className="flex flex-col gap-5">
      {/* Room code display */}
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
          Room Code
        </p>
        <div className="flex justify-center gap-2">
          {roomCode?.split('').map((char, i) => (
            <div
              key={i}
              className="flex h-16 w-14 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
            >
              <span className="text-game text-2xl font-bold text-amber-400">{char}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-zinc-500">Share this code with friends</p>
        <button
          onClick={handleCopy}
          className="mt-1 text-xs text-amber-400 hover:text-amber-300 transition"
        >
          {copied ? '✓ Copied!' : '📋 Copy Code'}
        </button>
      </div>

      {/* Player list */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
          Players
        </p>
        <div className="flex flex-col gap-1.5">
          <AnimatePresence>
            {players.map((player) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/40 px-3 py-2.5"
              >
                <span className="text-lg">🔥</span>
                <span className="text-sm text-zinc-200">{player.name}</span>
                {player.id === room?.hostId && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                    Host
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {players.length < 2 && (
          <p className="mt-3 flex items-center justify-center gap-2 text-xs italic text-zinc-600">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500/60" />
            Waiting for players to join...
          </p>
        )}
      </div>

      {/* Start button (host only) */}
      {isHost && (
        <motion.button
          className={`w-full rounded-xl py-3 text-game text-lg font-bold uppercase tracking-wider transition-all ${
            canStart
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_30px_rgba(245,158,11,0.25)]'
              : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
          }`}
          whileHover={canStart ? { scale: 1.02, filter: 'brightness(1.1)' } : {}}
          whileTap={canStart ? { scale: 0.97 } : {}}
          onClick={() => { if (canStart) { playClick(); handleStartTogether() } }}
          disabled={!canStart}
        >
          Start Together
        </motion.button>
      )}

      {!isHost && (
        <p className="text-center text-xs text-zinc-500 italic">
          Waiting for host to start...
        </p>
      )}
    </div>
  )

  // ── Create tab content ──
  const renderCreateTab = () => {
    if (isInRoom) return renderLobbyView()

    return (
      <div className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-game text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-amber-500 transition"
        />
        <motion.button
          className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-3 text-game text-lg font-bold uppercase tracking-wider text-white shadow-[0_0_30px_rgba(245,158,11,0.25)] disabled:opacity-40 disabled:shadow-none"
          whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { playClick(); handleCreate() }}
          disabled={!name.trim() || isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Room'}
        </motion.button>
      </div>
    )
  }

  // ── Join tab content ──
  const renderJoinTab = () => {
    if (isInRoom) return renderLobbyView()

    return (
      <div className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-game text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-amber-500 transition"
        />

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
            Room Code
          </p>
          <div className="flex justify-center gap-2" onPaste={handleJoinPaste}>
            {joinDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { joinInputRefs.current[i] = el }}
                type="text"
                value={digit}
                onChange={(e) => handleJoinDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleJoinKeyDown(i, e)}
                maxLength={1}
                className="h-14 w-12 rounded-xl border border-zinc-700 bg-zinc-950 text-center text-game text-xl font-bold text-zinc-100 uppercase outline-none focus:border-amber-500 transition"
              />
            ))}
          </div>
        </div>

        <motion.button
          className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-3 text-game text-lg font-bold uppercase tracking-wider text-white shadow-[0_0_30px_rgba(245,158,11,0.25)] disabled:opacity-40 disabled:shadow-none"
          whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { playClick(); handleJoin() }}
          disabled={!name.trim() || joinCode.length < 6 || isLoading}
        >
          {isLoading ? 'Joining...' : 'Join Room'}
        </motion.button>

        {error && (
          <p className="text-center text-sm text-red-400">{error}</p>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      />

      {/* Card */}
      <motion.div
        className="fixed inset-0 z-[71] flex items-center justify-center p-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div
          className="glass-card relative w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300 transition text-lg"
          >
            ✕
          </button>

          {/* Header */}
          <div className="mb-5 text-center">
            <h2 className="text-game text-2xl font-bold tracking-widest text-zinc-100 uppercase">
              Study Room
            </h2>
            <p className="mt-1 text-sm text-zinc-500">Study together in real-time</p>
          </div>

          {/* Tabs */}
          {!isInRoom && (
            <div className="mb-5 flex rounded-lg border border-zinc-800 overflow-hidden">
              <button
                onClick={() => { setTab('create'); clearError() }}
                className={`flex-1 py-2.5 text-game text-sm font-bold uppercase tracking-wider transition ${
                  tab === 'create'
                    ? 'bg-zinc-800 text-zinc-100 border-b-2 border-amber-500'
                    : 'bg-transparent text-zinc-500 hover:text-zinc-400'
                }`}
              >
                Create
              </button>
              <button
                onClick={() => { setTab('join'); clearError() }}
                className={`flex-1 py-2.5 text-game text-sm font-bold uppercase tracking-wider transition ${
                  tab === 'join'
                    ? 'bg-zinc-800 text-zinc-100 border-b-2 border-amber-500'
                    : 'bg-transparent text-zinc-500 hover:text-zinc-400'
                }`}
              >
                Join
              </button>
            </div>
          )}

          {/* Tab content */}
          {tab === 'create' ? renderCreateTab() : renderJoinTab()}
        </div>
      </motion.div>
    </>
  )
}
