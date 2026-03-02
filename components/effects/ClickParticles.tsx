'use client'

import { useEffect, useRef } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { getTheme } from '@/lib/themes'

const DEFAULT_COLORS = ['255,180,50', '255,150,30', '255,120,20']
const PARTICLE_COUNT_MIN = 8
const PARTICLE_COUNT_MAX = 12
const THROTTLE_MS = 100
const LIFETIME_MS = 500
const GRAVITY = 0.15

interface Particle {
  el: HTMLDivElement
  x: number
  y: number
  vx: number
  vy: number
  birth: number
}

export default function ClickParticles() {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastClickRef = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleClick(e: MouseEvent) {
      const now = performance.now()
      if (now - lastClickRef.current < THROTTLE_MS) return
      lastClickRef.current = now
      if (!container) return

      // Read theme colors at click time
      const themeId = useSessionStore.getState().userStats.activeTheme
      const theme = getTheme(themeId)
      const colors = theme.colors.particles.length > 0 ? theme.colors.particles : DEFAULT_COLORS

      const count = PARTICLE_COUNT_MIN + Math.floor(Math.random() * (PARTICLE_COUNT_MAX - PARTICLE_COUNT_MIN + 1))
      const particles: Particle[] = []

      for (let i = 0; i < count; i++) {
        const el = document.createElement('div')
        const size = 3 + Math.random() * 3
        const color = colors[Math.floor(Math.random() * colors.length)]
        el.style.cssText = `
          position: fixed;
          pointer-events: none;
          z-index: 40;
          width: ${size}px;
          height: ${size}px;
          background: rgb(${color});
          left: ${e.clientX}px;
          top: ${e.clientY}px;
          will-change: transform, opacity;
        `
        container.appendChild(el)

        particles.push({
          el,
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 8,  // -4 to 4
          vy: -5 + Math.random() * 7,      // -5 to 2
          birth: now,
        })
      }

      let rafId: number

      function animate() {
        const t = performance.now()
        let alive = false

        for (const p of particles) {
          const age = t - p.birth
          if (age > LIFETIME_MS) {
            if (p.el.parentNode) p.el.parentNode.removeChild(p.el)
            continue
          }

          alive = true
          p.vy += GRAVITY
          p.x += p.vx
          p.y += p.vy

          const progress = age / LIFETIME_MS
          const opacity = 1 - progress
          const scale = 1 - progress * 0.7

          p.el.style.transform = `translate(${p.x - e.clientX}px, ${p.y - e.clientY}px) scale(${scale})`
          p.el.style.opacity = String(opacity)
        }

        if (alive) {
          rafId = requestAnimationFrame(animate)
        }
      }

      rafId = requestAnimationFrame(animate)

      // Safety cleanup
      setTimeout(() => {
        cancelAnimationFrame(rafId)
        for (const p of particles) {
          if (p.el.parentNode) p.el.parentNode.removeChild(p.el)
        }
      }, LIFETIME_MS + 50)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return <div ref={containerRef} className="pointer-events-none fixed inset-0 z-40" />
}
