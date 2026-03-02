'use client'

import type { CaughtMoment } from '@/lib/types'

const DISTRACTION_EMOJI: Record<string, string> = {
  phone: '📱',
  sleeping: '😴',
  chatting: '💬',
  zoned_out: '🫠',
  eating: '🍕',
  looking_away: '👀',
}

const STAMP: Record<string, { text: string; color: string }> = {
  distracted: { text: 'CAUGHT', color: 'text-red-500' },
  away: { text: 'MISSING', color: 'text-amber-500' },
  focused: { text: 'LOCKED IN', color: 'text-green-500' },
}

const BORDER: Record<string, string> = {
  distracted: 'border-red-500/40',
  away: 'border-amber-500/40',
  focused: 'border-green-500/40',
}

const FILTER: Record<string, string> = {
  distracted: 'brightness(1.1) contrast(1.05)',
  away: 'brightness(0.7) grayscale(0.3)',
  focused: 'saturate(1.1)',
}

function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface CaughtCardProps {
  moment: CaughtMoment
  compact?: boolean
}

export default function CaughtCard({ moment, compact }: CaughtCardProps) {
  const stamp = STAMP[moment.type]
  const border = BORDER[moment.type]
  const filter = FILTER[moment.type]
  const emoji = moment.distractionType ? DISTRACTION_EMOJI[moment.distractionType] ?? '❓' : null

  const w = compact ? 'w-[200px]' : 'w-[280px]'
  const h = compact ? 'h-[260px]' : 'h-[360px]'

  return (
    <div className={`${w} ${h} flex-shrink-0 overflow-hidden rounded-xl border-2 ${border} bg-zinc-950 shadow-lg`}>
      {/* Photo area — top 70% */}
      <div className="relative" style={{ height: '70%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/jpeg;base64,${moment.imageData}`}
          alt="Caught moment"
          className="h-full w-full object-cover"
          style={{ filter }}
        />

        {/* Timestamp overlay */}
        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
          📷 {formatTimestamp(moment.timestamp)}
        </span>

        {/* Diagonal status stamp */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className={`text-game ${compact ? 'text-2xl' : 'text-4xl'} font-bold ${stamp.color} opacity-60`}
            style={{ transform: 'rotate(-15deg)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
          >
            {stamp.text}
          </span>
        </div>
      </div>

      {/* Bottom info area — 30% */}
      <div className="flex h-[30%] flex-col justify-between bg-zinc-900 p-3">
        <div>
          {/* Distraction type */}
          {moment.type !== 'focused' && moment.distractionType && (
            <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold text-zinc-300`}>
              {emoji} {moment.distractionType.replace('_', ' ')}
            </p>
          )}
          {moment.type === 'focused' && (
            <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold text-green-400`}>
              Laser focused
            </p>
          )}
          {/* Roast */}
          <p className={`${compact ? 'text-[9px]' : 'text-xs'} mt-1 italic text-zinc-500 line-clamp-2`}>
            {moment.roast}
          </p>
        </div>
        {/* Focus score */}
        <p className={`text-[10px] font-bold ${moment.type === 'focused' ? 'text-green-400' : 'text-red-400'}`}>
          Focus: {moment.focusScore}%
        </p>
      </div>
    </div>
  )
}
