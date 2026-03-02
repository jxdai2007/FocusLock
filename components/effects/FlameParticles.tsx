'use client'

import { useEffect, useRef } from 'react'
import type { FlameState } from '@/components/flame/FocusFlame'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
  life: number
  maxLife: number
  decay: number
}

type Mode = 'idle' | 'focused' | 'distracted' | 'life-lost' | 'session-end'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const W = 400
const H = 500
const MAX_PARTICLES = 100
const BASE_X = W / 2
const BASE_Y = H - 60 // flame base sits near the bottom

const COLORS = {
  warmAmber: ['255,180,50', '255,150,30', '255,120,20'],
  coolGreen: ['50,220,100', '30,200,150', '80,255,130'],
  mixGreen: ['200,230,50', '100,220,80'],
  red: ['255,60,30', '255,40,20', '200,30,10'],
  burst: ['255,50,20', '255,100,30', '255,200,150', '255,255,200'],
  dying: ['255,150,50', '200,120,40', '150,100,60', '100,90,80'],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function modeFromState(state: FlameState): Mode {
  if (state === 'life-lost') return 'life-lost'
  if (state === 'session-end' || state === 'dying') return 'session-end'
  if (state === 'distracted' || state === 'away') return 'distracted'
  if (state === 'focused' || state === 'flare' || state === 'setup') return 'focused'
  return 'idle'
}

function getFocusedColors(intensity: number, themeColors?: string[]): string[] {
  if (intensity < 50) return themeColors ?? COLORS.warmAmber
  if (intensity <= 80) return [...(themeColors ?? COLORS.warmAmber).slice(0, 1), ...COLORS.mixGreen]
  return COLORS.coolGreen
}

// ---------------------------------------------------------------------------
// Spawn functions
// ---------------------------------------------------------------------------

function spawnIdle(themeColors?: string[]): Particle {
  const color = pick(themeColors ?? COLORS.warmAmber)
  const life = rand(1.5, 2.5)
  return {
    x: BASE_X + rand(-30, 30),
    y: BASE_Y,
    vx: rand(-0.3, 0.3),
    vy: rand(-1.5, -0.5),
    size: rand(1.5, 3),
    opacity: 1,
    color,
    life,
    maxLife: life,
    decay: 1,
  }
}

function spawnFocused(intensity: number, themeColors?: string[]): Particle {
  const color = pick(getFocusedColors(intensity, themeColors))
  const life = rand(2, 3)
  return {
    x: BASE_X + rand(-20, 20),
    y: BASE_Y,
    vx: rand(-0.2, 0.2),
    vy: rand(-2.5, -1.0),
    size: rand(1.5, 3.5),
    opacity: 1,
    color,
    life,
    maxLife: life,
    decay: 1,
  }
}

function spawnDistracted(): Particle {
  const color = pick(COLORS.red)
  const life = rand(0.8, 1.5)
  const goDown = Math.random() < 0.2
  return {
    x: BASE_X + rand(-60, 60),
    y: BASE_Y,
    vx: rand(-2.0, 2.0),
    vy: goDown ? rand(0.2, 0.5) : rand(-1.0, -0.3),
    size: rand(1, 2.5),
    opacity: 1,
    color,
    life,
    maxLife: life,
    decay: 1,
  }
}

function spawnBurst(): Particle {
  const color = pick(COLORS.burst)
  const life = rand(0.5, 1.0)
  return {
    x: BASE_X + rand(-40, 40),
    y: BASE_Y,
    vx: rand(-4, 4),
    vy: rand(-3, 3),
    size: rand(2, 5),
    opacity: 1,
    color,
    life,
    maxLife: life,
    decay: 1,
  }
}

function spawnDying(progress: number): Particle {
  const colorIdx = Math.min(3, Math.floor(progress * 4))
  const color = COLORS.dying[colorIdx]
  const life = rand(1, 2)
  const sizeMax = 3 - progress * 2
  return {
    x: BASE_X + rand(-15, 15),
    y: BASE_Y,
    vx: rand(-0.5, 0.5),
    vy: rand(-0.8, -0.3),
    size: Math.max(1, rand(1, sizeMax)),
    opacity: 1,
    color,
    life,
    maxLife: life,
    decay: 1,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FlameParticlesProps {
  state: FlameState
  intensity: number
  particleColors?: string[]
}

export default function FlameParticles({ state, intensity, particleColors }: FlameParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const lastSpawnRef = useRef(0)
  const prevStateRef = useRef(state)
  const sessionEndStartRef = useRef(0)
  const rafRef = useRef(0)
  const lastFrameRef = useRef(0)

  // Handle life-lost burst
  useEffect(() => {
    if (state === 'life-lost' && prevStateRef.current !== 'life-lost') {
      const pool = particlesRef.current
      const count = Math.min(30, MAX_PARTICLES - pool.length)
      for (let i = 0; i < count; i++) {
        pool.push(spawnBurst())
      }
    }
    if ((state === 'session-end' || state === 'dying') && prevStateRef.current !== 'session-end' && prevStateRef.current !== 'dying') {
      sessionEndStartRef.current = performance.now()
    }
    prevStateRef.current = state
  }, [state])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Scale for device pixel ratio
    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    lastFrameRef.current = performance.now()

    function loop(now: number) {
      const dt = Math.min((now - lastFrameRef.current) / 1000, 0.1) // cap delta
      lastFrameRef.current = now
      const pool = particlesRef.current
      const mode = modeFromState(state)

      // --- Spawn ---
      const timeSinceSpawn = now - lastSpawnRef.current
      let spawnInterval: number

      switch (mode) {
        case 'idle':
          spawnInterval = 200
          break
        case 'focused':
          spawnInterval = Math.max(50, 150 - intensity)
          break
        case 'distracted':
          spawnInterval = 100
          break
        case 'session-end': {
          const elapsed = (now - sessionEndStartRef.current) / 1000
          const progress = Math.min(1, elapsed / 2)
          spawnInterval = 50 + progress * 450 // 50ms → 500ms
          break
        }
        default:
          spawnInterval = 200
      }

      if (timeSinceSpawn >= spawnInterval && pool.length < MAX_PARTICLES && mode !== 'life-lost') {
        lastSpawnRef.current = now
        switch (mode) {
          case 'idle':
            pool.push(spawnIdle(particleColors))
            break
          case 'focused':
            pool.push(spawnFocused(intensity, particleColors))
            break
          case 'distracted':
            pool.push(spawnDistracted())
            break
          case 'session-end': {
            const elapsed = (now - sessionEndStartRef.current) / 1000
            pool.push(spawnDying(Math.min(1, elapsed / 2)))
            break
          }
        }
      }

      // --- Update ---
      for (let i = pool.length - 1; i >= 0; i--) {
        const p = pool[i]
        p.x += p.vx
        p.y += p.vy
        p.vy -= 0.01 // slight upward accel
        p.life -= p.decay * dt
        p.opacity = Math.max(0, Math.min(p.life / p.maxLife, 1))
        if (p.life <= 0) {
          pool.splice(i, 1)
        }
      }

      // --- Draw ---
      ctx!.clearRect(0, 0, W, H)

      const useGlow = mode === 'focused' && intensity > 80
      if (useGlow) {
        ctx!.shadowBlur = 8
      }

      for (const p of pool) {
        if (useGlow) {
          ctx!.shadowColor = `rgba(${p.color},${p.opacity * 0.5})`
        }
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${p.color},${p.opacity})`
        ctx!.fill()
      }

      if (useGlow) {
        ctx!.shadowBlur = 0
        ctx!.shadowColor = 'transparent'
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
    // Re-create loop when state/intensity/colors change so closures capture latest values
  }, [state, intensity, particleColors])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute z-[5]"
      style={{
        width: W,
        height: H,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    />
  )
}
