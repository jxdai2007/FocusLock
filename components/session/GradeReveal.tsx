'use client'

import SRankReveal from '@/components/animations/SRankReveal'
import ARankReveal from '@/components/session/reveals/ARankReveal'
import BRankReveal from '@/components/session/reveals/BRankReveal'
import CRankReveal from '@/components/session/reveals/CRankReveal'

interface GradeRevealProps {
  grade: 'S' | 'A' | 'B' | 'C'
  focusPercentage: number
  onComplete: () => void
  onShake: (shaking: boolean) => void
}

export default function GradeReveal({ grade, focusPercentage, onComplete, onShake }: GradeRevealProps) {
  switch (grade) {
    case 'S':
      return <SRankReveal active onComplete={onComplete} onShake={onShake} />
    case 'A':
      return <ARankReveal active onComplete={onComplete} onShake={onShake} />
    case 'B':
      return <BRankReveal active onComplete={onComplete} onShake={onShake} />
    case 'C':
      return <CRankReveal active focusPercentage={focusPercentage} onComplete={onComplete} onShake={onShake} />
  }
}
