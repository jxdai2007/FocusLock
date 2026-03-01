import type { InventoryItem, ShopItem } from './types'

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'extra_life',
    name: 'Extra Life',
    description: 'Start your next session with +1 bonus life',
    icon: '💖',
    cost: 50,
    category: 'lives',
    effect: 'bonus_life',
    stackable: true,
  },
  {
    id: 'streak_freeze',
    name: 'Streak Freeze',
    description: 'Protects your day streak if you miss a day',
    icon: '🧊',
    cost: 75,
    category: 'streaks',
    effect: 'streak_freeze',
    stackable: true,
  },
  {
    id: 'double_coins',
    name: 'Double Coins',
    description: '2x coins earned on your next session',
    icon: '⭐',
    cost: 100,
    category: 'coins',
    effect: 'double_coins',
    stackable: true,
  },
  {
    id: 'shield',
    name: 'Focus Shield',
    description: "Your first distraction won't cost a life",
    icon: '🛡️',
    cost: 60,
    category: 'lives',
    effect: 'first_free',
    stackable: true,
  },
  {
    id: 'coin_magnet',
    name: 'Coin Magnet',
    description: '+50% bonus coins on your next session',
    icon: '🧲',
    cost: 40,
    category: 'coins',
    effect: 'coin_bonus_50',
    stackable: true,
  },
  {
    id: 'phoenix',
    name: 'Phoenix Feather',
    description: 'If you lose all lives, revive once with 1 life',
    icon: '🪶',
    cost: 150,
    category: 'lives',
    effect: 'revive',
    stackable: false,
  },
]

export function getItem(id: string): ShopItem {
  return SHOP_ITEMS.find((item) => item.id === id)!
}

export function getInventoryCount(inventory: InventoryItem[], itemId: string): number {
  return inventory.find((i) => i.itemId === itemId)?.quantity ?? 0
}

export function canAfford(coins: number, item: ShopItem): boolean {
  return coins >= item.cost
}
