'use client'

import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring, motion } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  className?: string
  /** Format function applied to each frame (default: Math.round) */
  format?: (n: number) => string
}

export default function AnimatedNumber({
  value,
  className,
  format = (n) => String(Math.round(n)),
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 100, damping: 30 })

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  useEffect(() => {
    const unsubscribe = spring.on('change', (v) => {
      if (ref.current) ref.current.textContent = format(v)
    })
    return unsubscribe
  }, [spring, format])

  return <motion.span ref={ref} className={className}>{format(value)}</motion.span>
}
