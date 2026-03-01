'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        enabled ? 'bg-amber-500' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`absolute left-0 top-0.5 h-5 w-5 rounded-full shadow-md transition-transform ${
          enabled ? 'translate-x-[22px] bg-white' : 'translate-x-0.5 bg-zinc-400'
        }`}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function SettingRow({
  label,
  helper,
  children,
}: {
  label: string
  helper?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800/30 py-3">
      <div className="min-w-0">
        <p className="text-sm text-zinc-300">{label}</p>
        {helper && <p className="mt-0.5 text-[10px] text-zinc-600">{helper}</p>}
      </div>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Capture interval options
// ---------------------------------------------------------------------------

const INTERVALS = [8, 12, 15, 20] as const

// ---------------------------------------------------------------------------
// SettingsPanel
// ---------------------------------------------------------------------------

interface SettingsPanelProps {
  onClose: () => void
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const {
    soundEnabled,
    soundVolume,
    roastToastsEnabled,
    milestoneToastsEnabled,
    webcamPreviewVisible,
    captureInterval,
    toggleSound,
    setVolume,
    toggleRoastToasts,
    toggleMilestoneToasts,
    toggleWebcamPreview,
    setCaptureInterval,
    resetDefaults,
  } = useSettingsStore()

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-50 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-zinc-800 bg-zinc-950/95 p-6 backdrop-blur-xl"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-game text-lg font-bold text-zinc-100">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-500 transition hover:text-zinc-300"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto thin-scroll">
          {/* Sound */}
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Sound
          </p>

          <SettingRow label="Sound Effects">
            <Toggle enabled={soundEnabled} onToggle={toggleSound} />
          </SettingRow>

          {soundEnabled && (
            <SettingRow label="Volume">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={soundVolume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-amber-500 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500"
              />
            </SettingRow>
          )}

          {/* Notifications */}
          <p className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Notifications
          </p>

          <SettingRow label="AI Roasts">
            <Toggle enabled={roastToastsEnabled} onToggle={toggleRoastToasts} />
          </SettingRow>

          <SettingRow label="Milestones">
            <Toggle enabled={milestoneToastsEnabled} onToggle={toggleMilestoneToasts} />
          </SettingRow>

          {/* Session */}
          <p className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Session
          </p>

          <SettingRow label="Webcam Preview" helper="Camera still captures when hidden">
            <Toggle enabled={webcamPreviewVisible} onToggle={toggleWebcamPreview} />
          </SettingRow>

          <SettingRow label="Capture Interval">
            <div className="flex gap-1">
              {INTERVALS.map((s) => (
                <button
                  key={s}
                  onClick={() => setCaptureInterval(s)}
                  className={`rounded-md border px-2 py-1 text-[10px] font-bold transition ${
                    captureInterval === s
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </SettingRow>
        </div>

        {/* Reset */}
        <button
          onClick={resetDefaults}
          className="mt-4 text-[11px] text-zinc-600 underline underline-offset-2 transition hover:text-zinc-400"
        >
          Reset to Defaults
        </button>
      </motion.div>
    </>
  )
}
