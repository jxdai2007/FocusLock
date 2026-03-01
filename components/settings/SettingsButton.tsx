'use client'

import { Settings } from 'lucide-react'

interface SettingsButtonProps {
  onOpen: () => void
}

export default function SettingsButton({ onOpen }: SettingsButtonProps) {
  return (
    <button
      onClick={onOpen}
      className="fixed top-4 right-4 z-40 rounded-full border border-zinc-800/50 bg-zinc-900/50 p-2 text-zinc-600 backdrop-blur-sm transition-all duration-300 hover:text-zinc-400 hover:rotate-90"
      aria-label="Settings"
    >
      <Settings size={20} />
    </button>
  )
}
