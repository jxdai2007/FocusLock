'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { playClick, playIgnite } from '@/lib/sounds'
import type { SessionConfig } from '@/lib/types'

const DURATION_OPTIONS = [5, 15, 25, 45, 60, 90] // minutes
const LIVES_OPTIONS = [1, 2, 3, 5]

const ALLOWED_TOOL_OPTIONS = [
  { id: 'tab switching',   label: 'Tab switching',   icon: '🖥️',  hint: 'coding, research' },
  { id: 'phone',           label: 'Phone',            icon: '📱',  hint: 'calculator, ref' },
  { id: 'iPad/tablet',     label: 'iPad / Tablet',    icon: '✏️',  hint: 'writing, drawing' },
  { id: 'textbook/notes',  label: 'Textbook / Notes', icon: '📚',  hint: 'reading ref' },
  { id: 'second monitor',  label: 'Second monitor',   icon: '🖥️',  hint: 'dual-screen' },
  { id: 'calculator',      label: 'Calculator',       icon: '🔢',  hint: 'math, stats' },
  { id: 'headphones',      label: 'Headphones',       icon: '🎧',  hint: 'music / focus' },
  { id: 'writing on paper',label: 'Paper / Notebook', icon: '📓',  hint: 'notes, math' },
] as const

interface SessionSetupProps {
  onStart: (config: SessionConfig) => void
  onCancel: () => void
}

export default function SessionSetup({ onStart, onCancel }: SessionSetupProps) {
  const [duration, setDuration] = useState(25)
  const [lives, setLives] = useState(3)
  const [taskDescription, setTaskDescription] = useState('')
  const [allowedTools, setAllowedTools] = useState<string[]>([])

  function toggleTool(id: string) {
    setAllowedTools((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }

  function handleSubmit() {
    if (!taskDescription.trim()) return
    playIgnite()
    onStart({
      duration,
      lives,
      taskDescription: taskDescription.trim(),
      allowedDevices: allowedTools,
      blockedSites: [],
    })
  }

  return (
    <>
      {/* Frosted overlay — slides up from bottom */}
      <motion.div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
      />

      {/* Card content — fades in with delay, collapses into center on exit */}
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.3, borderRadius: '50%' }}
        transition={{
          enter: { opacity: { delay: 0.2, duration: 0.3 } },
          exit: { duration: 0.4, ease: 'easeIn' },
        }}
      >
        <motion.div
          className="glass-card relative flex w-full max-w-lg flex-col gap-6 overflow-y-auto max-h-[90vh] p-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ scale: 0.3, opacity: 0 }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 200,
            delay: 0.15,
          }}
        >
          {/* Header */}
          <div className="text-center">
            <h1 className="text-game text-3xl font-bold tracking-widest text-amber-400 uppercase">
              Lock In
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Configure your focus session</p>
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-3">
            <p className="text-game text-xs font-bold tracking-widest text-zinc-400 uppercase">
              Session Length
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`rounded-lg border py-2 text-center transition-all ${
                    duration === d
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-game block text-lg font-bold leading-none">{d}</span>
                  <span className="text-[10px] text-zinc-500">min</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lives / Difficulty */}
          <div className="flex flex-col gap-3">
            <p className="text-game text-xs font-bold tracking-widest text-zinc-400 uppercase">
              Lives
            </p>
            <div className="flex gap-3">
              {LIVES_OPTIONS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLives(l)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-lg border py-3 transition-all ${
                    lives === l
                      ? 'border-red-500 bg-red-500/20'
                      : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-500'
                  }`}
                >
                  <span className="flex flex-wrap justify-center gap-0.5">
                    {Array.from({ length: l }).map((_, i) => (
                      <span key={i} className={`text-base ${lives === l ? 'text-red-400' : 'text-zinc-600'}`}>
                        ❤️
                      </span>
                    ))}
                  </span>
                  <span className={`text-game text-xs font-bold ${lives === l ? 'text-red-400' : 'text-zinc-500'}`}>
                    {l === 1 ? 'HARD' : l === 2 ? 'MEDIUM' : l === 3 ? 'NORMAL' : 'EASY'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Task description */}
          <div className="flex flex-col gap-2">
            <p className="text-game text-xs font-bold tracking-widest text-zinc-400 uppercase">
              What are you working on?
            </p>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="e.g. studying for calc final, writing my essay, leetcode grind..."
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-amber-500/50"
              rows={3}
              maxLength={200}
            />
            <p className="text-right text-[10px] text-zinc-600">{taskDescription.length}/200</p>
          </div>

          {/* Allowed tools */}
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-game text-xs font-bold tracking-widest text-zinc-400 uppercase">
                Allowed Tools & Behaviors
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-600">
                The AI will not penalize you for using these during your session.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALLOWED_TOOL_OPTIONS.map((tool) => {
                const active = allowedTools.includes(tool.id)
                return (
                  <button
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all ${
                      active
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                        : 'border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-base leading-none">{tool.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{tool.label}</p>
                      <p className="truncate text-[10px] text-zinc-600">{tool.hint}</p>
                    </div>
                    {active && (
                      <span className="ml-auto shrink-0 text-xs text-emerald-400">✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1 text-zinc-500 hover:text-zinc-300"
              onClick={() => { playClick(); onCancel() }}
            >
              Cancel
            </Button>
            <motion.div className="flex-[2]" whileTap={{ scale: 0.95 }}>
              <Button
                className="w-full bg-amber-500 text-black font-bold hover:bg-amber-400 disabled:opacity-40 text-game tracking-widest uppercase"
                disabled={!taskDescription.trim()}
                onClick={() => { playClick(); handleSubmit() }}
              >
                🔒 Lock In
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
