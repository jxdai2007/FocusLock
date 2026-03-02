'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore } from '@/stores/sessionStore'

const DIFFICULTY_STYLES: Record<string, { bg: string; border: string; badge: string; badgeBg: string }> = {
  easy:   { bg: 'bg-green-900/15', border: 'border-green-500/20', badge: 'text-green-400', badgeBg: 'bg-green-900/40' },
  medium: { bg: 'bg-amber-900/15', border: 'border-amber-500/20', badge: 'text-amber-400', badgeBg: 'bg-amber-900/40' },
  hard:   { bg: 'bg-red-900/15',   border: 'border-red-500/20',   badge: 'text-red-400',   badgeBg: 'bg-red-900/40' },
}

export default function QuestPanel() {
  const userStats = useSessionStore((s) => s.userStats)
  const generateDailyQuests = useSessionStore((s) => s.generateDailyQuests)
  const [isGenerating, setIsGenerating] = useState(false)

  const quests = userStats.dailyQuests
  const today = new Date().toISOString().slice(0, 10)
  const hasQuestsToday = userStats.questsLastGenerated === today && quests.length > 0

  async function handleGenerate() {
    setIsGenerating(true)
    await generateDailyQuests()
    setIsGenerating(false)
  }

  return (
    <div className="glass-card w-full max-w-lg px-6 py-4">
      <p className="mb-3 text-xs uppercase tracking-widest text-zinc-500">
        ⚔️ Daily Quests
      </p>

      {!hasQuestsToday ? (
        <div className="flex flex-col items-center py-6 gap-3">
          <p className="text-sm text-zinc-500 italic text-center">
            {quests.length === 0 ? 'No quests yet. Generate your daily challenges!' : 'New day, new quests!'}
          </p>
          <motion.button
            className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-game text-sm font-bold text-white shadow-[0_0_20px_rgba(245,158,11,0.2)] transition hover:brightness-110 disabled:opacity-50"
            whileTap={{ scale: 0.95 }}
            disabled={isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? '⏳ Generating...' : '⚔️ Generate Quests'}
          </motion.button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {quests.map((quest, i) => {
              const style = DIFFICULTY_STYLES[quest.difficulty] ?? DIFFICULTY_STYLES.easy
              return (
                <motion.div
                  key={quest.id}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${style.bg} ${style.border} ${
                    quest.completed ? 'opacity-60' : ''
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: quest.completed ? 0.6 : 1, x: 0 }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {/* Icon */}
                  <span className="text-2xl mt-0.5 shrink-0">
                    {quest.completed ? '✅' : quest.icon}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-game text-sm font-bold ${quest.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                        {quest.title}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.badge} ${style.badgeBg}`}>
                        {quest.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{quest.description}</p>
                  </div>

                  {/* Reward */}
                  <span className={`text-sm font-bold shrink-0 ${quest.completed ? 'text-green-400' : 'text-yellow-400'}`}>
                    {quest.completed ? '✓' : `+${quest.reward}`} 🪙
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
