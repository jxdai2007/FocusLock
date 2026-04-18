import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Orbitron, Bungee } from 'next/font/google'
import ClickParticles from '@/components/effects/ClickParticles'
import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
})

const bungee = Bungee({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bungee',
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
    <html lang="en" className={`dark ${orbitron.variable} ${bungee.variable}`}>
      <body className={GeistSans.className}>
        <div className="film-grain" aria-hidden="true" />
        <ClickParticles />
        {children}
      </body>
    </html>
  )
}
