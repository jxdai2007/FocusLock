'use client'

import { motion } from 'framer-motion'
import { SHOP_ITEMS, canAfford, getInventoryCount } from '@/lib/shop'
import { playClick, playCoinEarned } from '@/lib/sounds'
import { useSessionStore } from '@/stores/sessionStore'

interface ShopProps {
  onClose: () => void
}

export default function Shop({ onClose }: ShopProps) {
  const userStats = useSessionStore((s) => s.userStats)
  const purchaseItem = useSessionStore((s) => s.purchaseItem)

  function handlePurchase(itemId: string) {
    const success = purchaseItem(itemId)
    if (success) playCoinEarned()
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
          className="glass-card relative w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-game text-2xl font-bold text-zinc-100">🛒 SHOP</h2>
            <p className="text-game text-lg font-bold text-yellow-400">🪙 {userStats.totalCoins}</p>
          </div>

          {/* Item grid */}
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
                      onClick={() => handlePurchase(item.id)}
                    >
                      BUY
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
