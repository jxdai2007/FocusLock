'use client'

import { motion } from 'framer-motion'
import { getItem, SHOP_ITEMS } from '@/lib/shop'
import { playClick } from '@/lib/sounds'
import { useSessionStore } from '@/stores/sessionStore'

interface InventoryPanelProps {
  onOpenShop: () => void
}

export default function InventoryPanel({ onOpenShop }: InventoryPanelProps) {
  const userStats = useSessionStore((s) => s.userStats)
  const activateItem = useSessionStore((s) => s.activateItem)
  const deactivateItem = useSessionStore((s) => s.deactivateItem)

  const { inventory = [], activeItems = [] } = userStats

  // Build combined list: inventory items + active items (grouped by id)
  const itemMap = new Map<string, { inInventory: number; activeCount: number }>()

  for (const entry of inventory) {
    const existing = itemMap.get(entry.itemId) ?? { inInventory: 0, activeCount: 0 }
    existing.inInventory = entry.quantity
    itemMap.set(entry.itemId, existing)
  }
  for (const id of activeItems) {
    const existing = itemMap.get(id) ?? { inInventory: 0, activeCount: 0 }
    existing.activeCount += 1
    itemMap.set(id, existing)
  }

  const shopOrder = SHOP_ITEMS.map((s) => s.id)
  const items = Array.from(itemMap.entries())
    .map(([id, counts]) => ({
      id,
      item: getItem(id),
      ...counts,
      total: counts.inInventory + counts.activeCount,
    }))
    .sort((a, b) => shopOrder.indexOf(a.id) - shopOrder.indexOf(b.id))

  const isEmpty = items.length === 0

  return (
    <div className="glass-card w-full lg:w-64 lg:h-[calc(100vh-2rem)] flex flex-col p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
        🎒 Inventory
      </p>

      <div className="thin-scroll flex-1 overflow-y-auto">
        {isEmpty ? (
          <p className="text-xs text-zinc-600 italic py-8 text-center">
            No items yet. Visit the shop!
          </p>
        ) : (
          <div className="flex flex-col">
            {items.map(({ id, item, inInventory, activeCount, total }) => {
              const isActive = activeCount > 0

              return (
                <div
                  key={id}
                  className={`flex items-center gap-3 py-2.5 border-b border-zinc-800/30 ${
                    isActive ? 'border-amber-500/50' : ''
                  }`}
                  style={isActive ? { boxShadow: 'inset 0 0 12px rgba(245,158,11,0.08)' } : undefined}
                >
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{item.name}</p>
                    {total > 1 && (
                      <p className="text-xs text-zinc-500">x{total}</p>
                    )}
                  </div>
                  {isActive ? (
                    <motion.button
                      className="shrink-0 text-[10px] font-bold text-green-400 px-2 py-1"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { playClick(); deactivateItem(id) }}
                    >
                      ACTIVE ✓
                    </motion.button>
                  ) : (
                    <motion.button
                      className="shrink-0 rounded bg-amber-600/60 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-500"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { playClick(); activateItem(id) }}
                    >
                      USE
                    </motion.button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button
        className="mt-3 text-xs text-amber-400 hover:text-amber-300 transition"
        onClick={() => { playClick(); onOpenShop() }}
      >
        🛒 Open Shop
      </button>
    </div>
  )
}
