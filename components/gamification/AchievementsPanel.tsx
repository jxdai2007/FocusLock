'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { mergeAchievements } from '@/lib/achievements'
import { playClick } from '@/lib/sounds'
import { useSessionStore } from '@/stores/sessionStore'

// Panel: w-[380px], p-4 (16px/side) → 348px content
// scroll area -mx-1 pr-1 → net 0 change
// px-1 inner → 340px effective row width
// gap-2 (8px) × 2 = 16px total gap → each card = (340 - 16) / 3 ≈ 108px
const CARD_SIZE = 108
const ROW_WIDTH  = 340

const spring = { type: 'spring', stiffness: 380, damping: 32 } as const
const fast   = { duration: 0.16, ease: 'easeIn' } as const
const lockedStyle = { filter: 'grayscale(1)', opacity: 0.3 } as const
const cardStyle   = { overflow: 'hidden' as const, flexShrink: 0, borderRadius: 12, height: CARD_SIZE }

export default function AchievementsPanel() {
  const userStats    = useSessionStore((s) => s.userStats)
  const achievements = mergeAchievements(userStats.achievements)
  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const toggle = (id: string) => { playClick(); setSelectedId((p) => (p === id ? null : id)) }

  const rows: typeof achievements[] = []
  for (let i = 0; i < achievements.length; i += 3) rows.push(achievements.slice(i, i + 3))

  return (
    <div className="glass-card w-[380px] h-[calc(100vh-2rem)] flex flex-col p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">
        🏆 Achievements
      </p>
      <p className="text-xs text-zinc-600 mb-3">
        {unlockedCount} / {achievements.length} unlocked
      </p>

      <div className="thin-scroll flex-1 overflow-y-auto -mx-1 pr-1">
        <div className="flex flex-col gap-2 px-1">
          {rows.map((row, rowIdx) => {
            const selIdx      = row.findIndex((a) => a.id === selectedId)
            const hasSelection = selIdx !== -1

            return (
              <div
                key={rowIdx}
                className="flex gap-2 overflow-hidden"
                style={{ height: CARD_SIZE }}
              >
                {row.map((a, colIdx) => {
                  const isSelected  = a.id === selectedId
                  const isDismissed = hasSelection && !isSelected
                  // dismissed items slide TOWARD the selected item
                  const exitX = colIdx < selIdx ? 80 : -80

                  return (
                    <motion.div
                      key={a.id}
                      initial={false}
                      animate={{
                        width:   isDismissed ? 0 : isSelected ? ROW_WIDTH : CARD_SIZE,
                        x:       isDismissed ? exitX : 0,
                        opacity: isDismissed ? 0 : 1,
                        paddingTop:    isDismissed ? 0 : 12,
                        paddingBottom: isDismissed ? 0 : 12,
                        paddingLeft:   isDismissed ? 0 : 12,
                        paddingRight:  isDismissed ? 0 : isSelected ? 19 : 12,
                      }}
                      transition={isDismissed ? fast : spring}
                      className={`cursor-pointer border ${
                        a.unlocked
                          ? 'border-zinc-700/60 bg-zinc-800/40'
                          : 'border-zinc-800/30 bg-zinc-900/20'
                      }`}
                      style={cardStyle}
                      onClick={() => toggle(a.id)}
                    >
                      {isSelected ? (
                        /* ── Expanded row ── */
                        <div className="flex items-center gap-3 h-full">
                          <span
                            className="text-4xl leading-none shrink-0"
                            style={a.unlocked ? undefined : lockedStyle}
                          >
                            {a.icon}
                          </span>
                          <motion.div
                            className="flex-1 min-w-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.18, duration: 0.2 }}
                          >
                            <p className={`text-[13px] font-semibold leading-tight mb-0.5 ${
                              a.unlocked ? 'text-zinc-200' : 'text-zinc-500'
                            }`}>
                              {a.name}
                            </p>
                            <p className="text-[11px] text-zinc-500 leading-snug">
                              {a.description}
                            </p>
                          </motion.div>
                          <motion.span
                            className={`text-[11px] font-bold shrink-0 ${
                              a.unlocked ? 'text-yellow-400' : 'text-zinc-600'
                            }`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.22, duration: 0.2 }}
                          >
                            +{a.coinBonus} 🪙
                          </motion.span>
                        </div>
                      ) : (
                        /* ── Square tile ── */
                        <div className="flex flex-col items-center justify-center gap-1.5 h-full text-center">
                          <span
                            className="text-3xl leading-none"
                            style={a.unlocked ? undefined : lockedStyle}
                          >
                            {a.icon}
                          </span>
                          <p className={`text-[11px] font-medium leading-tight ${
                            a.unlocked ? 'text-zinc-200' : 'text-zinc-600'
                          }`}>
                            {a.name}
                          </p>
                          {a.unlocked && (
                            <span className="text-[9px] text-yellow-400/70">+{a.coinBonus} 🪙</span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
