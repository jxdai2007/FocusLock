import { Howl } from 'howler'

// ---------------------------------------------------------------------------
// Module-level singleton — lazy-created, unloaded when not needed
// ---------------------------------------------------------------------------

let bgSound: Howl | null = null
let isPlaying = false

function getSettings() {
  try {
    const { useSettingsStore } = require('@/stores/settingsStore')
    const { soundEnabled, soundVolume, backgroundSoundsEnabled, backgroundSoundsVolume } =
      useSettingsStore.getState()
    return { soundEnabled, soundVolume, backgroundSoundsEnabled, backgroundSoundsVolume }
  } catch {
    return { soundEnabled: true, soundVolume: 0.3, backgroundSoundsEnabled: true, backgroundSoundsVolume: 0.15 }
  }
}

export function startBackground() {
  try {
    const { soundEnabled, soundVolume, backgroundSoundsEnabled, backgroundSoundsVolume } = getSettings()
    if (!soundEnabled || !backgroundSoundsEnabled) return
    if (isPlaying) return

    if (!bgSound) {
      bgSound = new Howl({
        src: ['/sounds/backgroundsounds.mp3'],
        html5: true,
        loop: true,
        volume: backgroundSoundsVolume * soundVolume,
      })
    } else {
      bgSound.volume(backgroundSoundsVolume * soundVolume)
    }

    bgSound.play()
    isPlaying = true
  } catch {
    // silently ignore — SSR or missing file
  }
}

export function stopBackground() {
  try {
    if (bgSound) {
      bgSound.stop()
      bgSound.unload()
      bgSound = null
    }
    isPlaying = false
  } catch {
    isPlaying = false
  }
}

export function updateBackgroundVolume() {
  try {
    if (!bgSound || !isPlaying) return
    const { soundVolume, backgroundSoundsVolume } = getSettings()
    bgSound.volume(backgroundSoundsVolume * soundVolume)
  } catch {
    // ignore
  }
}
