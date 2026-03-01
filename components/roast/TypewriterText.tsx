'use client'

import { useEffect, useRef, useState } from 'react'

interface TypewriterTextProps {
  text: string
  speed?: number
  onComplete?: () => void
}

export default function TypewriterText({ text, speed = 30, onComplete }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const indexRef = useRef(0)
  const blinksRef = useRef(0)

  // Type characters one by one
  useEffect(() => {
    setDisplayed('')
    setShowCursor(true)
    indexRef.current = 0
    blinksRef.current = 0

    const id = setInterval(() => {
      indexRef.current += 1
      if (indexRef.current >= text.length) {
        setDisplayed(text)
        clearInterval(id)
        onComplete?.()
        return
      }
      setDisplayed(text.slice(0, indexRef.current))
    }, speed)

    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed])

  // After typing completes, blink cursor 3 more times then hide
  useEffect(() => {
    if (displayed !== text) return

    const id = setInterval(() => {
      blinksRef.current += 1
      if (blinksRef.current >= 6) {
        setShowCursor(false)
        clearInterval(id)
      }
    }, 500)

    return () => clearInterval(id)
  }, [displayed, text])

  const isTyping = displayed.length < text.length

  return (
    <span>
      {displayed}
      {showCursor && (
        <span
          className={`font-normal text-amber-400 ${isTyping ? '' : 'animate-blink'}`}
        >
          |
        </span>
      )}
    </span>
  )
}
