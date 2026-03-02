import { useEffect } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { startBackground, stopBackground, updateBackgroundVolume } from '@/lib/backgroundAudio'

export function useBackgroundSound() {
  const appState = useSessionStore((s) => s.appState)
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const soundVolume = useSettingsStore((s) => s.soundVolume)
  const backgroundSoundsEnabled = useSettingsStore((s) => s.backgroundSoundsEnabled)
  const backgroundSoundsVolume = useSettingsStore((s) => s.backgroundSoundsVolume)

  const shouldPlay = appState === 'active' && soundEnabled && backgroundSoundsEnabled

  // Start / stop based on combined condition
  useEffect(() => {
    if (shouldPlay) {
      startBackground()
    } else {
      stopBackground()
    }
    return () => stopBackground()
  }, [shouldPlay])

  // Update volume reactively when sliders change
  useEffect(() => {
    if (shouldPlay) updateBackgroundVolume()
  }, [shouldPlay, soundVolume, backgroundSoundsVolume])
}
