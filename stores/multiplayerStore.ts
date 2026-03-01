import { create } from 'zustand'
import {
  createRoom as fbCreateRoom,
  joinRoom as fbJoinRoom,
  leaveRoom as fbLeaveRoom,
  subscribeToRoom,
  updatePlayerState,
} from '@/lib/rooms'
import { database, ref, update } from '@/lib/firebase'
import type { RoomPlayer, StudyRoom, SessionState, SessionConfig } from '@/lib/types'

interface MultiplayerState {
  roomCode: string | null
  playerId: string | null
  playerName: string
  room: StudyRoom | null
  isHost: boolean
  isInRoom: boolean
  error: string | null

  createRoom: (name: string) => Promise<void>
  joinRoom: (code: string, name: string) => Promise<void>
  leaveRoom: () => Promise<void>
  setRoom: (room: StudyRoom | null) => void
  syncLocalState: (session: SessionState) => void
  markIdle: () => void
  clearError: () => void
}

let unsubscribe: (() => void) | null = null
let lastSyncTime = 0
let beforeUnloadHandler: (() => void) | null = null

function installBeforeUnload(roomCode: string, playerId: string) {
  if (beforeUnloadHandler) window.removeEventListener('beforeunload', beforeUnloadHandler)
  beforeUnloadHandler = () => {
    fbLeaveRoom(roomCode, playerId)
  }
  window.addEventListener('beforeunload', beforeUnloadHandler)
}

function removeBeforeUnload() {
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
    beforeUnloadHandler = null
  }
}

export const useMultiplayerStore = create<MultiplayerState>()((set, get) => ({
  roomCode: null,
  playerId: null,
  playerName: '',
  room: null,
  isHost: false,
  isInRoom: false,
  error: null,

  createRoom: async (name: string) => {
    try {
      const { roomCode, playerId } = await fbCreateRoom(name)
      set({ roomCode, playerId, playerName: name, isHost: true, isInRoom: true, error: null })

      unsubscribe = subscribeToRoom(roomCode, (room) => {
        get().setRoom(room)
      })

      installBeforeUnload(roomCode, playerId)
    } catch (e) {
      set({ error: `Failed to create room: ${e}` })
    }
  },

  joinRoom: async (code: string, name: string) => {
    try {
      const result = await fbJoinRoom(code, name)
      if (!result) {
        set({ error: 'Room not found or full' })
        return
      }
      set({ roomCode: code, playerId: result.playerId, playerName: name, isHost: false, isInRoom: true, error: null })

      unsubscribe = subscribeToRoom(code, (room) => {
        get().setRoom(room)
      })

      installBeforeUnload(code, result.playerId)
    } catch (e) {
      set({ error: `Failed to join room: ${e}` })
    }
  },

  leaveRoom: async () => {
    const { roomCode, playerId } = get()
    removeBeforeUnload()
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    if (roomCode && playerId) {
      await fbLeaveRoom(roomCode, playerId)
    }
    lastSyncTime = 0
    set({ roomCode: null, playerId: null, playerName: '', room: null, isHost: false, isInRoom: false, error: null })
  },

  setRoom: (room: StudyRoom | null) => {
    set({ room })
  },

  syncLocalState: (session: SessionState) => {
    const { roomCode, playerId } = get()
    if (!roomCode || !playerId) return

    // Throttle: max once every 3 seconds
    const now = Date.now()
    if (now - lastSyncTime < 3000) return
    lastSyncTime = now

    updatePlayerState(roomCode, playerId, {
      focusScore: session.focusScore,
      currentStreak: session.currentStreak,
      lives: session.lives,
      livesTotal: session.config.lives,
      status: session.lastAnalysis?.status ?? 'focused',
      flameIntensity: session.focusScore,
      coinsEarned: session.coinsEarned,
    })
  },

  markIdle: () => {
    const { roomCode, playerId } = get()
    if (!roomCode || !playerId) return
    updatePlayerState(roomCode, playerId, { status: 'idle' })
  },

  clearError: () => set({ error: null }),
}))
