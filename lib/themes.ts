import type { FlameTheme } from './types'

export const FLAME_THEMES: FlameTheme[] = [
  {
    id: 'classic',
    name: 'Classic Flame',
    description: 'The original. Warm and reliable.',
    icon: '🔥',
    cost: 0,
    colors: {
      primary: '#f59e0b',
      secondary: '#ef4444',
      glow: 'rgba(245,158,11,0.15)',
      particles: ['255,180,50', '255,150,30', '255,120,20'],
    },
    rarity: 'common',
  },
  {
    id: 'blue_ice',
    name: 'Frozen Flame',
    description: 'Cold focus. Icy determination.',
    icon: '🧊',
    cost: 200,
    colors: {
      primary: '#3b82f6',
      secondary: '#06b6d4',
      glow: 'rgba(59,130,246,0.15)',
      particles: ['50,130,255', '30,180,240', '100,200,255'],
    },
    lottieFilter: 'hue-rotate(200deg) saturate(1.3)',
    backgroundMood: 'rgba(59,130,246,0.08)',
    rarity: 'rare',
  },
  {
    id: 'purple_void',
    name: 'Void Flame',
    description: 'Channeling dark energy.',
    icon: '🔮',
    cost: 300,
    colors: {
      primary: '#7c3aed',
      secondary: '#a855f7',
      glow: 'rgba(124,58,237,0.15)',
      particles: ['124,58,237', '168,85,247', '200,130,255'],
    },
    lottieFilter: 'hue-rotate(270deg) saturate(1.5)',
    backgroundMood: 'rgba(124,58,237,0.08)',
    rarity: 'rare',
  },
  {
    id: 'pixel_fire',
    name: 'Pixel Fire',
    description: '8-bit energy. Retro focus.',
    icon: '👾',
    cost: 400,
    colors: {
      primary: '#22c55e',
      secondary: '#4ade80',
      glow: 'rgba(34,197,94,0.15)',
      particles: ['34,197,94', '74,222,128', '22,163,74'],
    },
    lottieFilter: 'hue-rotate(100deg) saturate(2) contrast(1.3)',
    backgroundMood: 'rgba(34,197,94,0.08)',
    rarity: 'epic',
  },
  {
    id: 'galaxy',
    name: 'Cosmic Flame',
    description: 'Stellar focus. Infinite power.',
    icon: '🌌',
    cost: 500,
    colors: {
      primary: '#ec4899',
      secondary: '#8b5cf6',
      glow: 'rgba(236,72,153,0.12)',
      particles: ['236,72,153', '139,92,246', '244,114,182', '167,139,250'],
    },
    lottieFilter: 'hue-rotate(300deg) saturate(1.8) brightness(1.1)',
    backgroundMood: 'rgba(236,72,153,0.08)',
    rarity: 'epic',
  },
  {
    id: 'golden',
    name: 'Divine Flame',
    description: 'Only the worthy. Pure gold.',
    icon: '👑',
    cost: 1000,
    colors: {
      primary: '#fbbf24',
      secondary: '#f59e0b',
      glow: 'rgba(251,191,36,0.25)',
      particles: ['251,191,36', '245,158,11', '255,220,80', '255,255,200'],
    },
    lottieFilter: 'sepia(0.3) saturate(2) brightness(1.2)',
    backgroundMood: 'rgba(251,191,36,0.1)',
    rarity: 'legendary',
  },
  {
    id: 'shadow',
    name: 'Shadow Flame',
    description: 'Invisible. Unstoppable.',
    icon: '🖤',
    cost: 750,
    colors: {
      primary: '#a1a1aa',
      secondary: '#52525b',
      glow: 'rgba(161,161,170,0.1)',
      particles: ['161,161,170', '82,82,91', '200,200,210', '120,120,130'],
    },
    lottieFilter: 'saturate(0) brightness(0.8)',
    backgroundMood: 'rgba(161,161,170,0.06)',
    rarity: 'rare',
  },
  {
    id: 'inferno',
    name: 'Inferno',
    description: 'Maximum intensity. Pure rage focus.',
    icon: '💀',
    cost: 600,
    colors: {
      primary: '#dc2626',
      secondary: '#991b1b',
      glow: 'rgba(220,38,38,0.2)',
      particles: ['220,38,38', '255,80,40', '180,20,10', '255,150,50'],
    },
    lottieFilter: 'hue-rotate(340deg) saturate(2) contrast(1.2)',
    backgroundMood: 'rgba(220,38,38,0.08)',
    rarity: 'epic',
  },
]

const classicTheme = FLAME_THEMES[0]

export function getTheme(id: string): FlameTheme {
  return FLAME_THEMES.find((t) => t.id === id) ?? classicTheme
}

export function getOwnedThemes(owned: string[]): FlameTheme[] {
  return FLAME_THEMES.filter((t) => owned.includes(t.id))
}

export function getRarityColor(rarity: FlameTheme['rarity']): string {
  switch (rarity) {
    case 'common':    return 'text-zinc-400'
    case 'rare':      return 'text-blue-400'
    case 'epic':      return 'text-purple-400'
    case 'legendary': return 'text-yellow-400'
  }
}

export function getRarityGlow(rarity: FlameTheme['rarity']): string {
  switch (rarity) {
    case 'legendary': return '0 0 15px rgba(251,191,36,0.3)'
    case 'epic':      return '0 0 10px rgba(168,85,247,0.2)'
    case 'rare':      return '0 0 8px rgba(59,130,246,0.15)'
    default:          return 'none'
  }
}
