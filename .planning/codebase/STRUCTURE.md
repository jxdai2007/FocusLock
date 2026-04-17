# Codebase Structure

**Analysis Date:** 2026-04-17

## Directory Layout

```
FocusLock/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout: fonts, dark mode, ClickParticles
│   ├── page.tsx            # Main page router (idle/setup/active/summary/analytics)
│   └── globals.css         # Global Tailwind + custom CSS vars (--ember-orange, --flame-red, etc.)
├── components/             # React UI components
│   ├── ui/                 # shadcn/ui primitives (button, card, dialog, input, slider, etc.)
│   ├── flame/              # FocusFlame.tsx + Fire.json Lottie
│   ├── session/            # SessionActive, SessionSetup, SessionSummary, CaughtCard, GradeReveal
│   ├── session/reveals/    # Rank reveals (A, B, C Rank animations)
│   ├── gamification/       # Shop, InventoryPanel, AchievementsPanel, MilestoneToast
│   ├── roast/              # TypewriterText (animated AI roasts)
│   ├── webcam/             # WebcamCapture.tsx (ref-based camera access)
│   ├── effects/            # AmbientMood, FlameParticles, ClickParticles (decorative)
│   ├── animations/         # AnimatedNumber, Shockwave, ScanLines, ConfettiExplosion, EmberParticles, MinecraftExplosion, SRankReveal
│   ├── analytics/          # AnalyticsDashboard (stats visualizations)
│   ├── multiplayer/        # RoomLobby, MultiplayerDashboard (study room integration)
│   └── settings/           # SettingsButton, SettingsPanel (user preferences, sound, capture interval)
├── hooks/                  # Custom React hooks
│   ├── useSessionLoop.ts   # Webcam capture loop, tab visibility, duration timer
│   ├── useFlameState.ts    # Derive flame visual state from focusScore
│   └── useBackgroundSound.ts # Ambient background audio during session
├── lib/                    # Pure functions and utilities
│   ├── types.ts            # TypeScript interfaces (FocusAnalysis, SessionState, SessionConfig, etc.)
│   ├── focusEngine.ts      # Pure functions: createInitialState, updateSession, calculateFocusScore, calculateCoins, getSessionSummary, checkMilestone
│   ├── gemini.ts           # Gemini Vision API: analyzeFrame(), generateSessionReview()
│   ├── sounds.ts           # Howler.js wrappers: playLifeLost, playNudge, playCoinEarned, playMilestone
│   ├── utils.ts            # Helpers: cn(), formatDuration(), formatMMSS()
│   ├── shop.ts             # Shop item/theme data helpers
│   ├── themes.ts           # Theme definitions, getTheme(), getRarityColor()
│   ├── achievements.ts     # Achievement unlock logic
│   ├── photoCapture.ts     # Store captured frames from distracted moments
│   ├── rooms.ts            # Study room Firebase logic (if enabled)
│   ├── backgroundAudio.ts  # Ambient sound playlist management
│   ├── gradeAudio.ts       # Rank reveal audio (A/B/C rank sounds)
│   ├── sRankAudio.ts       # S-rank special audio
│   ├── slamAudio.ts        # Slam/impact sound effects
│   └── firebase.ts         # Firebase init (optional, for multiplayer)
├── stores/                 # Zustand state stores
│   ├── sessionStore.ts     # Core game loop: session state, user stats, actions
│   ├── settingsStore.ts    # User preferences: sound, volume, capture interval
│   └── multiplayerStore.ts # Multiplayer room state
├── public/                 # Static assets
│   ├── animations/         # Fire.json (500×690px, 47 frames), coin.json (480×480px, 153 frames)
│   └── sounds/             # burn.mp3, ping.mp3, coin.mp3, fanfare.mp3 (+ rank/grade sounds)
└── Configuration files
    ├── next.config.mjs     # Next.js config (must be .mjs not .ts for v14)
    ├── tailwind.config.ts  # Tailwind + shadcn tokens + custom animations
    ├── tsconfig.json       # TypeScript strict mode
    ├── components.json     # shadcn/ui config (zinc, dark, cssVariables)
    ├── postcss.config.mjs  # PostCSS + Tailwind
    └── package.json        # Dependencies (Next.js 14, React 19, Tailwind, Framer Motion, Howler.js, Recharts, Zustand)
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router entry points
- Contains: Layout wrapper (fonts, theme), root page (router), global styles
- Key files: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

**`components/ui/`:**
- Purpose: shadcn/ui component library (unstyled, composable primitives)
- Contains: Button, Card, Dialog, Input, Slider, Badge, Progress, Label, Select, Separator
- Usage: Import and compose in feature components (e.g., `<Dialog><DialogContent>...</DialogContent></Dialog>`)

**`components/flame/`:**
- Purpose: Central visual metaphor (the focus flame)
- Contains: `FocusFlame.tsx` (Lottie player + Framer Motion controls), `Fire.json` (Lottie asset)
- Usage: Rendered in idle home, SessionActive HUD, emoji in buttons

**`components/session/`:**
- Purpose: Session workflow (setup → active → summary)
- Contains:
  - `SessionSetup.tsx`: Modal for config (duration, lives, task, allowed devices)
  - `SessionActive.tsx`: Full HUD during focus session (hearts, flame, timer, stats, webcam, roast)
  - `SessionSummary.tsx`: Post-session review (grade, coins, AI review, caught moments)
  - `CaughtCard.tsx`: Display captured distracted moment (image + roast)
  - `GradeReveal.tsx`: Simple grade display
  - `reveals/`: A/B/C rank reveal animations (video-like sequences)

**`components/gamification/`:**
- Purpose: Economy and progression (coins, shop, achievements, inventory)
- Contains:
  - `Shop.tsx`: Buy themes, items, revivals (coin shop interface)
  - `InventoryPanel.tsx`: Show owned items, activate/deactivate cosmetics
  - `AchievementsPanel.tsx`: Display unlocked badges
  - `MilestoneToast.tsx`: Toast when milestone reached (streak, comeback, perfect focus)

**`components/roast/`:**
- Purpose: AI-generated roast/encouragement display
- Contains: `TypewriterText.tsx` (animated typewriter effect for roast messages)

**`components/webcam/`:**
- Purpose: Manage camera access and frame capture
- Contains: `WebcamCapture.tsx` (forwardRef, exposes captureFrame() method returning base64 JPEG)
- Usage: useSessionLoop calls ref.current.captureFrame() every 12s

**`components/effects/`:**
- Purpose: Ambient visual effects (non-interactive)
- Contains:
  - `ClickParticles.tsx`: Click-following particle effect (global, in layout.tsx)
  - `FlameParticles.tsx`: Flame-like particles around flame element
  - `AmbientMood.tsx`: Dynamic background glow that changes with focus score

**`components/animations/`:**
- Purpose: Reusable animation components
- Contains:
  - `AnimatedNumber.tsx`: Number counter with spring animation
  - `Shockwave.tsx`: Expanding ring effect (used on life loss)
  - `ScanLines.tsx`: Retro scan line overlay
  - `ConfettiExplosion.tsx`: Celebratory confetti
  - `EmberParticles.tsx`: Rising ember particles
  - `MinecraftExplosion.tsx`: Pixelated explosion effect
  - `SRankReveal.tsx`: S-rank special reveal animation

**`components/analytics/`:**
- Purpose: Historical stats and trends
- Contains: `AnalyticsDashboard.tsx` (charts, session breakdowns, focus timeline)

**`components/multiplayer/`:**
- Purpose: Study room features (collaborative focus sessions)
- Contains:
  - `RoomLobby.tsx`: Join/create room modal
  - `MultiplayerDashboard.tsx`: Wrapper for SessionActive with room overlay (see other players' focus)

**`components/settings/`:**
- Purpose: User preferences UI
- Contains:
  - `SettingsButton.tsx`: Gear icon button (persistent, pinned)
  - `SettingsPanel.tsx`: Modal with toggles (sound, volume, background sounds, roast toasts, webcam preview, capture interval)

**`hooks/`:**
- Purpose: Encapsulate session loop logic and derived state
- Contains:
  - `useSessionLoop.ts`: Manages webcam capture interval, Gemini analysis calls, tab visibility, session timer
  - `useFlameState.ts`: Derive flame animation state from focus score
  - `useBackgroundSound.ts`: Start/stop ambient audio based on session state

**`lib/`:**
- Purpose: Pure functions, APIs, utilities (no React, no side effects except API calls)
- Key files:
  - `types.ts`: All TypeScript interfaces
  - `focusEngine.ts`: Game logic (calculateFocusScore, updateSession, calculateCoins)
  - `gemini.ts`: Gemini Vision API integration
  - `sounds.ts`: Howler.js sound management
  - `shop.ts`: Item/theme database
  - `themes.ts`: Flame theme definitions
  - `achievements.ts`: Badge unlock criteria

**`stores/`:**
- Purpose: Zustand state stores (persist to localStorage)
- Contains:
  - `sessionStore.ts`: Core game state (session, userStats, actions)
  - `settingsStore.ts`: User settings (sound enabled, volume, capture interval)
  - `multiplayerStore.ts`: Study room state (players, room info)

**`public/animations/`:**
- Purpose: Lottie animation JSON files
- Contains: `Fire.json` (flame loop), `coin.json` (coin spin)

**`public/sounds/`:**
- Purpose: Audio assets
- Contains: burn.mp3 (life lost), ping.mp3 (nudge), coin.mp3, fanfare.mp3, rank-reveal audio files

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Server-side wrapper, fonts + ClickParticles
- `app/page.tsx`: Client-side router, all modals and page states
- `hooks/useSessionLoop.ts`: Initializes 12-second Gemini loop when session active

**Configuration:**
- `tailwind.config.ts`: Custom CSS vars (--ember-orange, --flame-red, --flame-purple, --flame-blue, --coin-gold, --life-red), shadcn colors, animations
- `next.config.mjs`: Minimal Next.js config (note: .mjs required for v14)
- `tsconfig.json`: Strict TypeScript, path aliases (@/)
- `.env.local`: NEXT_PUBLIC_GEMINI_API_KEY (client-side, safe to commit during dev)

**Core Logic:**
- `lib/focusEngine.ts`: updateSession(), calculateFocusScore(), calculateCoins() — all pure
- `lib/gemini.ts`: analyzeFrame(), generateSessionReview() — Gemini API calls
- `stores/sessionStore.ts`: Game loop state, persisted user stats

**UI Patterns:**
- `components/session/SessionActive.tsx`: Example of large component with multiple hooks, animations, real-time updates
- `components/flame/FocusFlame.tsx`: Example of Lottie + Framer Motion integration
- `components/ui/`: Import and compose shadcn components for new modals/forms

**Testing & Sounds:**
- `lib/sounds.ts`: Howler.js instances, try/catch wrappers
- `public/sounds/`: Audio files (burn.mp3, ping.mp3, coin.mp3, fanfare.mp3)

## Naming Conventions

**Files:**
- PascalCase for components: `FocusFlame.tsx`, `SessionActive.tsx`, `WebcamCapture.tsx`
- camelCase for hooks: `useSessionLoop.ts`, `useFlameState.ts`
- camelCase for lib utilities: `focusEngine.ts`, `gemini.ts`, `sounds.ts`
- UPPERCASE for stores: `sessionStore.ts` (exports `useSessionStore`)
- lowercase for config: `next.config.mjs`, `tailwind.config.ts`

**Directories:**
- lowercase plural for feature groups: `components/`, `hooks/`, `stores/`, `lib/`, `public/`
- lowercase singular for sub-feature groups: `components/flame/`, `components/session/`, `components/animations/`
- UI primitives in `components/ui/` (shadcn convention)

**Functions:**
- camelCase: createInitialState(), updateSession(), analyzeFrame()
- Prefix custom hooks with `use`: useSessionLoop(), useFlameState()
- Prefix sound functions with `play`: playLifeLost(), playCoinEarned()

**Variables & Constants:**
- camelCase: focusScore, sessionState, currentStreak
- UPPER_SNAKE_CASE for environment vars: NEXT_PUBLIC_GEMINI_API_KEY
- const DEFAULTS: CAPTURE_INTERVAL = 12 (literal numbers as defaults)

**Types & Interfaces:**
- PascalCase: FocusAnalysis, SessionState, FlameTheme
- Suffix with Data: SessionSummaryData, AnalysisEvent
- Suffix with Handle/Ref for forwardRef types: WebcamHandle

**Styling:**
- Use predefined Tailwind classes only (no arbitrary values unless unavoidable)
- Dark mode via forced `dark` class in html (no light mode)
- Glass-card pattern: `backdrop-blur-md bg-zinc-900/40 border border-zinc-800/50 rounded-2xl`
- Flame colors: amber-500 (idle), orange-600 (focused), red-500 (distracted), purple-600/blue-600 (intense)
- Game text: apply `.text-game` class (uses Orbitron font) to scores, streaks, coins, headings

## Where to Add New Code

**New Feature (e.g., Daily Challenge):**
- Core logic: Add interface + pure function to `lib/` (e.g., `lib/challenges.ts`)
- State: Add fields to SessionState or new store in `stores/`
- UI: Create component in `components/` matching feature (e.g., `components/challenges/ChallengePanel.tsx`)
- Tests: Create `.spec.ts` file alongside impl (not yet in this project)

**New Component/Module:**
- Display only: `components/[feature]/[FeatureName].tsx`
- With hooks: `hooks/use[FeatureName].ts` + component
- With state: Add to `stores/sessionStore.ts` (ephemeral) or `stores/settingsStore.ts` (persistent)
- With API: Add fetch function to `lib/` (e.g., `lib/api/[endpoint].ts`)

**Utilities:**
- Shared helpers: `lib/utils.ts` (cn, formatDuration, formatMMSS)
- Domain-specific: New file in `lib/` (e.g., `lib/achievements.ts`, `lib/shop.ts`)
- Always camelCase filename, export as named exports

**Sound Effects:**
- Add .mp3 to `public/sounds/`
- Create Howler instance in `lib/sounds.ts` with try/catch wrapper
- Export `play[Effect]()` function
- Wire into sessionStore action if triggered by game logic

**Animations:**
- Lottie JSON: Add to `public/animations/` (use Lottie Editor)
- React component wrapper: `components/animations/[AnimationName].tsx`
- Use forwardRef if needing external control (e.g., play/pause from Framer Motion)
- Use `lottieRef.setSpeed()` for speed multiplier, not frame jumping

**Themes:**
- Theme definition: Add to `lib/themes.ts` (colors, particles, glow, rarity)
- Shop integration: Add ShopItem entry with cost, icon
- Database: Stored in localStorage via userStats.ownedThemes + activeTheme
- Apply to flame: Pass activeTheme ID to FocusFlame, apply CSS filters/colors

## Special Directories

**`public/animations/`:**
- Purpose: Lottie animation JSON assets
- Generated: Via Lottie Editor or After Effects export
- Committed: Yes
- Usage: `lottie-react` loads from path, wraps in component

**`public/sounds/`:**
- Purpose: Audio asset files (.mp3, .wav)
- Generated: No (external audio tools)
- Committed: Yes
- Usage: Howler.js lazily loads on demand

**`.planning/codebase/`:**
- Purpose: Generated architecture documentation
- Generated: Yes (by gsd-map-codebase)
- Committed: No (.gitignore)
- Usage: Reference for code generation, structure decisions

---

*Structure analysis: 2026-04-17*
