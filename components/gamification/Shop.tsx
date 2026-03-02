'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { SHOP_ITEMS, canAfford, getInventoryCount } from '@/lib/shop'
import { FLAME_THEMES, getRarityColor, getRarityGlow } from '@/lib/themes'
import { playClick, playCoinEarned } from '@/lib/sounds'
import { useSessionStore } from '@/stores/sessionStore'

// ---------------------------------------------------------------------------
// Rarity-based styling helpers
// ---------------------------------------------------------------------------

function getBuyButtonStyle(rarity: string, affordable: boolean): string {
  if (!affordable) return 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
  switch (rarity) {
    case 'rare':      return 'bg-blue-900/60 hover:bg-blue-800/60 border border-blue-500/30 text-blue-300'
    case 'epic':      return 'bg-purple-900/60 hover:bg-purple-800/60 border border-purple-500/30 text-purple-300'
    case 'legendary': return 'bg-yellow-900/60 hover:bg-yellow-800/60 border border-yellow-500/30 text-yellow-300'
    default:          return 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
  }
}

function getCardBorder(rarity: string): string {
  switch (rarity) {
    case 'rare':      return 'border-blue-500/20'
    case 'epic':      return 'border-purple-500/20'
    case 'legendary': return 'border-yellow-500/30'
    default:          return 'border-zinc-700/50'
  }
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

export type ShopTab = 'items' | 'flames'

interface ShopProps {
  onClose: () => void
  initialTab?: ShopTab
}

export default function Shop({ onClose, initialTab = 'items' }: ShopProps) {
  const [activeTab, setActiveTab] = useState<ShopTab>(initialTab)
  const userStats = useSessionStore((s) => s.userStats)
  const purchaseItem = useSessionStore((s) => s.purchaseItem)
  const purchaseTheme = useSessionStore((s) => s.purchaseTheme)
  const setActiveTheme = useSessionStore((s) => s.setActiveTheme)

  function handlePurchaseItem(itemId: string) {
    const success = purchaseItem(itemId)
    if (success) playCoinEarned()
  }

  function handlePurchaseTheme(themeId: string) {
    const success = purchaseTheme(themeId)
    if (success) playCoinEarned()
  }

  function handleEquipTheme(themeId: string) {
    setActiveTheme(themeId)
    playClick()
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Card */}
      <motion.div
        className="fixed inset-0 z-[71] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="glass-card relative w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 thin-scroll"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300 text-lg"
            onClick={() => { playClick(); onClose() }}
          >
            ✕
          </button>

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-game text-2xl font-bold text-zinc-100">🛒 SHOP</h2>
            <p className="text-game text-lg font-bold text-yellow-400">🪙 {userStats.totalCoins}</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            {(['items', 'flames'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { playClick(); setActiveTab(tab) }}
                className={`flex-1 rounded-lg py-2 text-game text-xs font-bold uppercase tracking-widest transition ${
                  activeTab === tab
                    ? 'bg-amber-600/80 text-white'
                    : 'bg-zinc-800/60 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'items' ? '🎒 Items' : '🔥 Flames'}
              </button>
            ))}
          </div>

          {/* Items Tab */}
          {activeTab === 'items' && (
            <div className="grid grid-cols-2 gap-3">
              {SHOP_ITEMS.map((item) => {
                const owned = getInventoryCount(userStats.inventory, item.id)
                const active = userStats.activeItems.filter((id) => id === item.id).length
                const totalOwned = owned + active
                const affordable = canAfford(userStats.totalCoins, item)
                const isOwnedNonStackable = !item.stackable && totalOwned > 0

                return (
                  <motion.div
                    key={item.id}
                    className="flex flex-col items-center rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-4"
                    whileTap={affordable && !isOwnedNonStackable ? { scale: 1.03 } : undefined}
                  >
                    <span className="text-3xl">{item.icon}</span>
                    <p className="text-game text-sm font-bold text-zinc-200 mt-2 text-center">{item.name}</p>
                    <p className="text-xs text-zinc-500 mt-1 text-center line-clamp-2">{item.description}</p>
                    <p className="text-sm text-yellow-400 mt-2">🪙 {item.cost}</p>
                    {totalOwned > 0 && (
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Owned: {totalOwned}
                      </p>
                    )}

                    {isOwnedNonStackable ? (
                      <button
                        className="mt-2 w-full rounded-lg bg-green-900/30 px-3 py-1.5 text-xs font-bold text-green-400 cursor-default"
                        disabled
                      >
                        OWNED
                      </button>
                    ) : (
                      <button
                        className={`mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          affordable
                            ? 'bg-amber-600/80 text-white hover:bg-amber-500'
                            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        }`}
                        disabled={!affordable}
                        onClick={() => handlePurchaseItem(item.id)}
                      >
                        BUY
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Flames Tab */}
          {activeTab === 'flames' && (
            <div className="grid grid-cols-2 gap-3">
              {FLAME_THEMES.map((theme) => {
                const isOwned = userStats.ownedThemes.includes(theme.id)
                const isActive = userStats.activeTheme === theme.id
                const affordable = userStats.totalCoins >= theme.cost
                const rarityColor = getRarityColor(theme.rarity)
                const cardBorder = getCardBorder(theme.rarity)

                return (
                  <motion.div
                    key={theme.id}
                    className={`flex flex-col items-center rounded-xl border bg-zinc-800/40 p-4 ${cardBorder}`}
                    style={{ boxShadow: getRarityGlow(theme.rarity) }}
                    whileTap={!isOwned && affordable ? { scale: 1.03 } : undefined}
                  >
                    {/* Preview area */}
                    <div
                      className="flex h-24 w-full items-center justify-center rounded-lg"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${theme.colors.glow}, transparent 70%), #09090b`,
                        filter: theme.lottieFilter || 'none',
                      }}
                    >
                      <span className="text-4xl">{theme.icon}</span>
                    </div>

                    {/* Name */}
                    <p className="text-game text-sm font-bold text-zinc-200 mt-3 text-center">{theme.name}</p>

                    {/* Rarity badge */}
                    <p className={`text-[9px] font-bold uppercase tracking-[0.15em] ${rarityColor}`}>
                      {theme.rarity}
                    </p>

                    {/* Description */}
                    <p className="text-xs text-zinc-500 mt-1 text-center">{theme.description}</p>

                    {/* Bottom action */}
                    {isOwned && isActive ? (
                      <div className="mt-3 w-full rounded-lg bg-green-900/30 px-4 py-1.5 text-center text-xs font-bold text-green-400">
                        EQUIPPED ✓
                      </div>
                    ) : isOwned ? (
                      <button
                        className="mt-3 w-full rounded-lg bg-amber-600/80 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-amber-500"
                        onClick={() => handleEquipTheme(theme.id)}
                      >
                        EQUIP
                      </button>
                    ) : (
                      <>
                        <p className={`text-sm mt-2 ${rarityColor}`}>🪙 {theme.cost}</p>
                        <button
                          className={`mt-1 w-full rounded-lg px-3 py-1.5 text-xs font-bold transition ${getBuyButtonStyle(theme.rarity, affordable)}`}
                          disabled={!affordable}
                          onClick={() => handlePurchaseTheme(theme.id)}
                        >
                          BUY
                        </button>
                      </>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  )
}
