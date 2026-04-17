# Technology Stack

**Analysis Date:** 2026-04-17

## Languages

**Primary:**
- TypeScript 5 - Full codebase (strict mode enabled)
- JavaScript (ES2024) - Configuration files, Next.js runtime

**Secondary:**
- CSS 3 - Tailwind utilities and custom keyframes in `app/globals.css`
- HTML 5 - JSX/TSX templates

## Runtime

**Environment:**
- Node.js - Development and production runtime
- Next.js 14.2.5 (App Router) - Full-stack React framework

**Package Manager:**
- npm - Installed dependencies, lockfile present

## Frameworks

**Core:**
- Next.js 14.2.5 - App Router, server/client components, image optimization
- React 18 - UI component library, hooks (useRef, useEffect, useImperative)

**Styling:**
- Tailwind CSS 3.4.0 - Utility-first CSS framework
- shadcn/ui (zinc dark theme) - Pre-built accessible React components
- PostCSS 8 - CSS transformation pipeline
- Autoprefixer 10 - Vendor prefix automation

**UI Components:**
- @radix-ui/* (v1-2) - Accessible component primitives (Dialog, Label, Progress, Select, Separator, Slider, Slot)
- Lucide React 0.400.0 - SVG icon library (400+ icons)
- class-variance-authority 0.7.0 - Component variant system
- clsx 2.1.0 - Conditional className utility
- tailwind-merge 2.3.0 - Intelligent Tailwind class merging

**Animation:**
- Framer Motion 11.0.0 - React animation library (motion.div, AnimatePresence, keyframe animations)
- lottie-react 2.4.1 - Lottie animation player (Fire.json, coin.json from public/animations/)
- tailwindcss-animate 1.0.7 - Keyframe animation utilities

**Data Visualization:**
- Recharts 2.12.0 - React charting library (AreaChart for focus timeline)

**Fonts:**
- Geist Sans (geist 1.7.0) - Default Next.js sans-serif font
- Google Fonts: Orbitron - Gaming/display font for scores, counters, headings (variable CSS: --font-orbitron)

**State Management:**
- Zustand 4.5.0 - Lightweight state store with localStorage persist middleware
- Location: `stores/sessionStore.ts` (AppState, UserStats, SessionState)
- Persistence key: 'focuslock-stats' (userStats only)

**Audio:**
- Howler.js 2.2.4 - HTML5 Audio wrapper with lazy initialization
- Types: @types/howler 2.2.11
- Sound files in `public/sounds/` (MP3 format: burn, ping, coin, fanfare, ignite, click, confetti, trombone, tnt, backgroundsounds)
- Global 300ms cooldown to prevent sound stack overflow

**Utilities:**
- html-to-image 1.11.13 - Convert DOM elements to images (for photocapture feature)

**Developer Tools:**
- ESLint 8 - JavaScript linter with eslint-config-next
- TypeScript 5 - Static type checking with strict compiler options

## Key Dependencies

**Critical:**
- next 14.2.5 - Core framework, required for App Router and Vercel deployment
- react 18, react-dom 18 - UI rendering engine
- zustand 4.5.0 - Session state and user stats persistence
- @radix-ui/react-dialog 1.1.15 - Modal/dialog component foundation

**Infrastructure:**
- tailwindcss 3.4.0 - CSS compilation from utility classes
- typescript 5 - Type safety throughout codebase
- framer-motion 11.0.0 - Smooth animations for gaming feel
- howler 2.2.4 - Cross-browser audio playback

**Vision API Integration:**
- google-cloud/vision or native fetch - Gemini 2.5 Flash via public REST API (no client SDK)
- Base64 image encoding for JPEG transmission
- JSON response parsing with TypeScript interfaces

**Database/Realtime:**
- firebase 12.10.0 - Firebase Realtime Database for multiplayer features
- Services used: getDatabase(), ref(), set(), onValue(), remove(), update(), push(), get()

## Configuration

**Environment:**
- .env.local file (must be created)
- NEXT_PUBLIC_GEMINI_API_KEY - Gemini 2.5 Flash API key (from `.env.example`)
- Firebase config embedded in `lib/firebase.ts` (hardcoded for now, can be moved to env vars)

**Build:**
- next.config.mjs - Next.js build configuration (empty, uses defaults)
- tsconfig.json - TypeScript compiler: strict mode, path aliases (@/*)
- tailwind.config.ts - Tailwind configuration: dark mode class, custom colors, animation plugins
- components.json - shadcn/ui configuration: zinc theme, CSS variables, icon library (lucide)
- postcss.config.js - PostCSS + Autoprefixer for CSS processing

**Type Definitions:**
- next-env.d.ts - Next.js generated types
- TypeScript strict checks enabled: noUnusedLocals, noImplicitAny, etc.

## Platform Requirements

**Development:**
- Node.js (LTS recommended)
- npm or package manager supporting package.json
- Modern browser with webcam API support (getUserMedia)
- Chrome, Firefox, Safari, Edge (Chromium 50+)

**Production:**
- Vercel (Next.js hosting - native support for App Router)
- Static export not supported (due to API routes and dynamic features)
- Edge runtime compatible for some functions
- Environment variables: NEXT_PUBLIC_GEMINI_API_KEY required in Vercel dashboard

**Browser Requirements:**
- MediaDevices API (getUserMedia) - webcam capture
- Canvas API - frame capture to JPEG
- Visibility API - tab focus detection
- localStorage - client-side state persistence
- Web Audio API - sound playback via Howler.js

---

*Stack analysis: 2026-04-17*
