import { Howl } from 'howler'

// ---------------------------------------------------------------------------
// Global cooldown — ignore plays within 300ms of the previous one
// ---------------------------------------------------------------------------

let lastPlayedTime = 0

function canPlay(): boolean {
  const now = Date.now()
  if (now - lastPlayedTime < 300) return false
  lastPlayedTime = now
  return true
}

// ---------------------------------------------------------------------------
// Lazy Howl instances — created on first play, never during import
// ---------------------------------------------------------------------------

let burnSound: Howl | null = null
let pingSound: Howl | null = null
let coinSound: Howl | null = null
let fanfareSound: Howl | null = null
let igniteSound: Howl | null = null
let clickSound: Howl | null = null
let confettiSound: Howl | null = null
let tromboneSound: Howl | null = null
let tntSound: Howl | null = null

function getSettings(): { soundEnabled: boolean; soundVolume: number } {
  try {
    const { useSettingsStore } = require('@/stores/settingsStore')
    const { soundEnabled, soundVolume } = useSettingsStore.getState()
    return { soundEnabled, soundVolume }
  } catch {
    return { soundEnabled: true, soundVolume: 0.3 }
  }
}

function play(getOrCreate: () => Howl, volume: number) {
  if (!canPlay()) return
  const { soundEnabled, soundVolume } = getSettings()
  if (!soundEnabled) return
  try {
    const sound = getOrCreate()
    sound.volume(volume * soundVolume)
    sound.play()
  } catch {
    // silently ignore — missing file or SSR context
  }
}

/** Play immediately, bypassing the global cooldown (for important sounds). */
function playImmediate(getOrCreate: () => Howl, volume: number) {
  const { soundEnabled, soundVolume } = getSettings()
  if (!soundEnabled) return
  try {
    const sound = getOrCreate()
    sound.volume(volume * soundVolume)
    sound.play()
  } catch {
    // silently ignore
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function playLifeLost() {
  play(() => {
    burnSound ??= new Howl({ src: ['/sounds/burn.mp3'] })
    return burnSound
  }, 0.5)
}

export function playNudge() {
  play(() => {
    pingSound ??= new Howl({ src: ['/sounds/ping.mp3'] })
    return pingSound
  }, 0.4)
}

export function playCoinEarned() {
  play(() => {
    coinSound ??= new Howl({ src: ['/sounds/coin.mp3'] })
    return coinSound
  }, 0.45)
}

export function playMilestone() {
  // Bypasses cooldown — this is a big moment, never swallowed
  playImmediate(() => {
    fanfareSound ??= new Howl({ src: ['/sounds/fanfare.mp3'] })
    return fanfareSound
  }, 0.55)
}

export function playIgnite() {
  playImmediate(() => {
    igniteSound ??= new Howl({ src: ['/sounds/ignite.mp3'] })
    return igniteSound
  }, 0.5)
}

export function playClick() {
  play(() => {
    clickSound ??= new Howl({ src: ['/sounds/click.mp3'] })
    return clickSound
  }, 0.35)
}

export function playConfetti() {
  // Bypasses cooldown — fires alongside other celebration sounds
  playImmediate(() => {
    confettiSound ??= new Howl({ src: ['/sounds/confetti.mp3'] })
    return confettiSound
  }, 0.5)
}

export function playTrombone() {
  // Bypasses cooldown — fires alongside coin sound
  playImmediate(() => {
    tromboneSound ??= new Howl({ src: ['/sounds/trombone.mp3'] })
    return tromboneSound
  }, 0.45)
}

export function playTNT() {
  // Bypasses cooldown — fires alongside impact sounds
  playImmediate(() => {
    tntSound ??= new Howl({ src: ['/sounds/tnt.mp3'] })
    return tntSound
  }, 0.5)
}
