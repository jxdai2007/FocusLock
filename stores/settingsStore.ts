import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings } from '@/lib/types'

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  soundVolume: 0.3,
  roastToastsEnabled: true,
  milestoneToastsEnabled: true,
  voiceRoastsEnabled: false,
  webcamPreviewVisible: true,
  captureInterval: 12,
}

interface SettingsState extends AppSettings {
  toggleSound: () => void
  setVolume: (v: number) => void
  toggleRoastToasts: () => void
  toggleMilestoneToasts: () => void
  toggleVoiceRoasts: () => void
  toggleWebcamPreview: () => void
  setCaptureInterval: (s: number) => void
  resetDefaults: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      setVolume: (v: number) => set({ soundVolume: v }),
      toggleRoastToasts: () => set((s) => ({ roastToastsEnabled: !s.roastToastsEnabled })),
      toggleMilestoneToasts: () => set((s) => ({ milestoneToastsEnabled: !s.milestoneToastsEnabled })),
      toggleVoiceRoasts: () => set((s) => ({ voiceRoastsEnabled: !s.voiceRoastsEnabled })),
      toggleWebcamPreview: () => set((s) => ({ webcamPreviewVisible: !s.webcamPreviewVisible })),
      setCaptureInterval: (s: number) => set({ captureInterval: s }),
      resetDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'focuslock-settings',
      partialize: (state) => ({
        soundEnabled: state.soundEnabled,
        soundVolume: state.soundVolume,
        roastToastsEnabled: state.roastToastsEnabled,
        milestoneToastsEnabled: state.milestoneToastsEnabled,
        voiceRoastsEnabled: state.voiceRoastsEnabled,
        webcamPreviewVisible: state.webcamPreviewVisible,
        captureInterval: state.captureInterval,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppSettings> | undefined
        return { ...current, ...DEFAULT_SETTINGS, ...p }
      },
    },
  ),
)
