import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats seconds as "Xm YYs" — e.g. 4m 03s */
export function formatDuration(totalSeconds: number): string {
  const s = Math.floor(Math.abs(totalSeconds))
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

/** Formats seconds as "MM:SS" — e.g. 04:03 */
export function formatMMSS(totalSeconds: number): string {
  const s = Math.floor(Math.abs(totalSeconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
