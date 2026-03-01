import { database, ref, set, onValue, remove, update, get, off } from '@/lib/firebase'
import type { RoomPlayer, StudyRoom } from '@/lib/types'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

export async function createRoom(playerName: string): Promise<{ roomCode: string; playerId: string }> {
  const roomCode = generateRoomCode()
  const playerId = Math.random().toString(36).substring(2, 10)

  const roomRef = ref(database, `rooms/${roomCode}`)
  await set(roomRef, {
    id: roomCode,
    hostId: playerId,
    createdAt: Date.now(),
    isActive: false,
    players: {},
  })

  const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`)
  await set(playerRef, {
    id: playerId,
    name: playerName,
    focusScore: 100,
    currentStreak: 0,
    lives: 0,
    livesTotal: 0,
    status: 'idle',
    lastUpdate: Date.now(),
    flameIntensity: 30,
    coinsEarned: 0,
  } satisfies RoomPlayer)

  localStorage.setItem('focuslock-playerId', playerId)
  localStorage.setItem('focuslock-roomCode', roomCode)

  return { roomCode, playerId }
}

export async function joinRoom(
  roomCode: string,
  playerName: string,
): Promise<{ playerId: string } | null> {
  const roomRef = ref(database, `rooms/${roomCode}`)
  const snapshot = await get(roomRef)

  if (!snapshot.exists()) return null

  const room = snapshot.val() as StudyRoom
  const playerCount = room.players ? Object.keys(room.players).length : 0
  if (playerCount >= 6) return null

  const playerId = Math.random().toString(36).substring(2, 10)

  const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`)
  await set(playerRef, {
    id: playerId,
    name: playerName,
    focusScore: 100,
    currentStreak: 0,
    lives: 0,
    livesTotal: 0,
    status: 'idle',
    lastUpdate: Date.now(),
    flameIntensity: 30,
    coinsEarned: 0,
  } satisfies RoomPlayer)

  localStorage.setItem('focuslock-playerId', playerId)
  localStorage.setItem('focuslock-roomCode', roomCode)

  return { playerId }
}

export function subscribeToRoom(
  roomCode: string,
  callback: (room: StudyRoom | null) => void,
): () => void {
  const roomRef = ref(database, `rooms/${roomCode}`)
  const handler = onValue(roomRef, (snapshot) => {
    callback(snapshot.val() as StudyRoom | null)
  })

  return () => off(roomRef, 'value', handler)
}

export async function updatePlayerState(
  roomCode: string,
  playerId: string,
  data: Partial<RoomPlayer>,
): Promise<void> {
  const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`)
  await update(playerRef, { ...data, lastUpdate: Date.now() })
}

export async function leaveRoom(roomCode: string, playerId: string): Promise<void> {
  const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`)
  await remove(playerRef)

  const playersRef = ref(database, `rooms/${roomCode}/players`)
  const snapshot = await get(playersRef)
  if (!snapshot.exists() || !snapshot.val()) {
    await remove(ref(database, `rooms/${roomCode}`))
  }

  localStorage.removeItem('focuslock-playerId')
  localStorage.removeItem('focuslock-roomCode')
}

export async function deleteRoom(roomCode: string): Promise<void> {
  await remove(ref(database, `rooms/${roomCode}`))
}
