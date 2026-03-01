'use client'

import { useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Color palette — weighted distribution
// ---------------------------------------------------------------------------

const COLOR_POOL: string[] = []
const PALETTE: [string, number][] = [
  ['#4a4a4a', 30], // dark gray
  ['#2d2d2d', 20], // darker gray
  ['#6b6b6b', 15], // medium gray
  ['#8b8b8b', 10], // light gray
  ['#1a1a1a', 10], // near black
  ['#ff8800', 5],  // orange fire
  ['#ffcc00', 5],  // yellow fire
  ['#ff4400', 5],  // red fire
]
for (const [c, w] of PALETTE) for (let i = 0; i < w; i++) COLOR_POOL.push(c)

function pickColor() {
  return COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)]
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

// ---------------------------------------------------------------------------
// Particle
// ---------------------------------------------------------------------------

interface MCParticle {
  el: HTMLDivElement
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  maxLife: number
  rot: number
  rotTimer: number
  canBounce: boolean
  bounces: number
}

function spawnParticle(
  wrap: HTMLElement,
  cx: number,
  cy: number,
  vx: number,
  vy: number,
): MCParticle {
  const size = Math.round(rand(4, 12))
  const color = pickColor()
  const rot = [0, 90, 180, 270][Math.floor(Math.random() * 4)]
  const x = cx - size / 2
  const y = cy - size / 2
  const life = rand(0.8, 1.5)

  const el = document.createElement('div')
  el.style.cssText =
    `position:fixed;left:0;top:0;width:${size}px;height:${size}px;` +
    `background:${color};pointer-events:none;z-index:62;will-change:transform,opacity;` +
    `transform:translate(${x}px,${y}px) rotate(${rot}deg);`
  wrap.appendChild(el)

  return { el, x, y, vx, vy, size, life, maxLife: life, rot, rotTimer: 0, canBounce: false, bounces: 0 }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MinecraftExplosionProps {
  active: boolean
}

export default function MinecraftExplosion({ active }: MinecraftExplosionProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)
  const spawnedRef = useRef(false)

  useEffect(() => {
    if (!active || spawnedRef.current) return
    spawnedRef.current = true

    const wrap = wrapRef.current
    if (!wrap) return

    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const vh = window.innerHeight

    const particles: MCParticle[] = []

    // Clustered spawn: 6 chunks of 3-4 particles each
    for (let c = 0; c < 6; c++) {
      const angle = Math.random() * Math.PI * 2
      const speed = rand(8, 15)
      const baseVx = Math.cos(angle) * speed
      const baseVy = Math.sin(angle) * speed - 5 // upward bias
      const count = Math.floor(rand(3, 5))
      for (let i = 0; i < count; i++) {
        particles.push(spawnParticle(wrap, cx, cy, baseVx + rand(-2, 2), baseVy + rand(-2, 2)))
      }
    }

    // Fill remaining to ~45 with individual scatter
    while (particles.length < 45) {
      particles.push(spawnParticle(wrap, cx, cy, rand(-15, 15), rand(-18, 8)))
    }

    // Mark 5-6 largest particles as bounceable
    const sorted = [...particles].sort((a, b) => b.size - a.size)
    for (let i = 0; i < Math.min(6, sorted.length); i++) sorted[i].canBounce = true

    // --- Chunky screen shake (stepped, not smooth) ---
    let shakeCount = 0
    const shakeId = setInterval(() => {
      shakeCount++
      if (shakeCount >= 10) {
        clearInterval(shakeId)
        document.documentElement.style.transform = ''
        return
      }
      document.documentElement.style.transform =
        `translate(${Math.round(rand(-6, 6))}px,${Math.round(rand(-4, 4))}px)`
    }, 50)

    // --- Physics loop ---
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      let alive = false

      for (const p of particles) {
        if (p.life <= 0) continue
        alive = true

        // Integrate
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.4 // gravity
        p.life -= dt

        // Stepped rotation: 90° increments every 100ms
        p.rotTimer += dt * 1000
        if (p.rotTimer >= 100) {
          p.rotTimer -= 100
          p.rot = (p.rot + 90) % 360
        }

        // Bounce off viewport bottom
        if (p.canBounce && p.y > vh - 20 && p.vy > 0 && p.bounces < 2) {
          p.vy = -p.vy * 0.4
          p.vx *= 0.7
          p.bounces++
          p.y = vh - 20
        }

        // Scale: 1 → 0.3 over lifetime
        const ratio = Math.max(0, p.life / p.maxLife)
        const scale = 0.3 + ratio * 0.7

        // Opacity: 1 for first 60%, then fade
        const opacity = ratio > 0.4 ? 1 : ratio / 0.4

        p.el.style.transform = `translate(${p.x}px,${p.y}px) rotate(${p.rot}deg) scale(${scale})`
        p.el.style.opacity = String(Math.max(0, opacity))
      }

      if (!alive) {
        for (const p of particles) p.el.remove()
        particles.length = 0
        return
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearInterval(shakeId)
      document.documentElement.style.transform = ''
      for (const p of particles) p.el.remove()
      particles.length = 0
      spawnedRef.current = false
    }
  }, [active])

  // Reset spawn flag when deactivated
  useEffect(() => {
    if (!active) spawnedRef.current = false
  }, [active])

  return <div ref={wrapRef} className="pointer-events-none fixed inset-0 z-[62]" />
}
