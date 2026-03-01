'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface ShockwaveProps {
  active: boolean
}

export default function Shockwave({ active }: ShockwaveProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="rounded-full"
            style={{ border: '3px solid #ef4444' }}
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: '150vw', height: '150vw', opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
