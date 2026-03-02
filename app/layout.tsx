import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Orbitron } from 'next/font/google'
import ClickParticles from '@/components/effects/ClickParticles'
import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FocusLock 🔒',
  description: 'AI-powered study accountability',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${orbitron.variable}`}>
      <body className={GeistSans.className}>
        <ClickParticles />
        {children}
      </body>
    </html>
  )
}
