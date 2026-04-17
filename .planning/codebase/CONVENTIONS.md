# Coding Conventions

**Analysis Date:** 2026-04-17

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `FocusFlame.tsx`, `SessionActive.tsx`)
- Hooks: camelCase prefix with `use` (e.g., `useSessionLoop.ts`, `useFlameState.ts`)
- Utilities/Libraries: camelCase (e.g., `gemini.ts`, `focusEngine.ts`, `sounds.ts`)
- Stores: camelCase with `Store` suffix (e.g., `sessionStore.ts`, `settingsStore.ts`)
- Types: camelCase with descriptive names (e.g., `types.ts` for interfaces, imported as types)

**Functions:**
- camelCase throughout (e.g., `analyzeFrame`, `calculateFocusScore`, `playLifeLost`)
- Prefix utility functions with action verbs: `build`, `create`, `calculate`, `get`, `check`, `play`, `add`, `remove`
- Pure helper functions in dedicated files: `lib/focusEngine.ts`, `lib/gemini.ts`

**Variables:**
- camelCase (e.g., `flameState`, `currentStreak`, `webcamRef`, `lostHeartIdx`)
- Boolean flags: prefix with `is` or `has` (e.g., `isAnalyzing`, `hasShield`, `isGameOver`)
- React refs: suffix with `Ref` (e.g., `webcamRef`, `lottieRef`, `canvasRef`, `streamRef`)
- State updaters in stores: camelCase (e.g., `setActiveTheme`, `startSession`, `endSession`)

**Types & Interfaces:**
- PascalCase for all interfaces and types (e.g., `FocusAnalysis`, `SessionState`, `WebcamHandle`)
- Union types inline: `status: 'focused' | 'distracted' | 'away'`
- Organized in `lib/types.ts` — all project types centralized
- Suffix with descriptive suffix: `Props`, `Handle`, `Data`, `State`, `Config`

## Code Style

**Formatting:**
- No explicit formatter configured (relies on Next.js default)
- Semicolons: required
- Quotes: single quotes for strings
- Line length: ~100 characters (observed in codebase)

**Linting:**
- ESLint: `next/core-web-vitals` extends
- Config: `.eslintrc.json` (minimal, delegates to Next.js)
- Command: `npm run lint`
- NO eslint-disable comments allowed unless rule is in `.eslintrc.json`
  - Observed pattern in `hooks/useSessionLoop.ts` line 104: `// eslint-disable-next-line react-hooks/exhaustive-deps` is used only when justified
  - This means the rule is configured/expected in the project

## Import Organization

**Order:**
1. React/Next.js imports (`import React`, `import { useEffect }`, etc.)
2. External third-party packages (Framer Motion, Lucide, Recharts, Zustand, Lottie, etc.)
3. Relative imports from `@/` aliases (components, lib, stores, hooks)

**Path Aliases:**
- `@/*` → root directory (defined in `tsconfig.json`)
- Always use absolute `@/` imports, never relative (`../../../`)
- Examples: `@/components/flame/FocusFlame`, `@/lib/types`, `@/stores/sessionStore`

**Pattern:**
```typescript
// 1. React & Next.js
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// 2. External packages (alphabetical within group)
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import { Heart } from 'lucide-react'
import { AreaChart, Area, ... } from 'recharts'

// 3. Internal imports (alphabetical)
import FocusFlame from '@/components/flame/FocusFlame'
import WebcamCapture, { type WebcamHandle } from '@/components/webcam/WebcamCapture'
import { analyzeFrame } from '@/lib/gemini'
import type { FocusAnalysis, SessionState } from '@/lib/types'
import { useSessionStore } from '@/stores/sessionStore'
```

## Error Handling

**Strategy:** Silent fallback with logging

**Gemini API (lib/gemini.ts):**
- Function returns `null` on any error (network, parsing, malformed response)
- Errors logged to console with `[gemini]` prefix (e.g., `console.error('[gemini] analyzeFrame error:', err)`)
- Caller handles null gracefully — skips analysis, no UI crash
- Fallback on HTTP error: returns default encouraging message (generateSessionReview)

**Sound (lib/sounds.ts):**
- All sound plays wrapped in try/catch
- Silently ignores missing files, SSR context, browser errors
- Respects sound enabled/disabled setting before attempting play
- Lazy Howl instantiation prevents errors at import time

**Webcam (components/webcam/WebcamCapture.tsx):**
- Graceful degradation for permission denial, no camera, loading states
- Status states: `'loading' | 'active' | 'denied' | 'no-camera'`
- Retry button provided for denied state
- Capture returns `null` if not active — caller checks before sending

**API Calls (General):**
- `.catch()` → return fallback or null
- `.then()` with `err instanceof Error` type guard before accessing `.name` or `.message`
- Try/catch around JSON.parse (in `gemini.ts` analyzeFrame)

**Pattern Example (from lib/gemini.ts):**
```typescript
try {
  const res = await fetch(...)
  if (!res.ok) {
    console.error('[gemini] analyzeFrame HTTP error:', res.status, errText)
    return null
  }
  const data = await res.json()
  const analysis = JSON.parse(text) as FocusAnalysis
  // Validate and adjust confidence threshold
  if (analysis.status === 'distracted' && analysis.confidence < 0.85) {
    return { ...analysis, status: 'focused', distraction_type: null }
  }
  return analysis
} catch (err) {
  console.error('[gemini] analyzeFrame error:', err)
  return null
}
```

## Logging

**Framework:** Native `console.*` (no external logger)

**Patterns:**
- Prefix logs with module identifier in brackets: `[gemini]`, `[focusEngine]`, `[sounds]`
- Only errors logged; warnings rarely used
- No verbose info/debug logs in production code
- Session store and hooks use `getState()` to access current state for logging

**When to Log:**
- API errors (HTTP status, parsing failures)
- Confidence threshold adjustments (`[gemini] Low confidence distraction ignored: 0.75`)
- Sound failures (missing files, errors in try/catch blocks)
- No logging for normal app flow (focus detection success, roasts, milestones)

## Comments

**When to Comment:**
- Complex algorithms: `calculateFocusScore()` has comment explaining exponential decay window
- State transitions: `lib/focusEngine.ts` uses section dividers with `// -----------` comments
- Non-obvious conditionals: e.g., confidence threshold logic in `analyzeFrame()`
- Data structure decisions: e.g., `distractionsByType: Record<string, number>` instead of array
- Intentional limitations: e.g., "Always accept 'away' results regardless of confidence"

**What NOT to Comment:**
- Obvious code (e.g., `const now = Date.now() // get current time`)
- API contract (use type definitions instead)
- Implementation details that follow patterns (e.g., standard Zustand store setup)

**JSDoc/TSDoc:**
- Minimal use; interfaces and types are self-documenting
- Function signatures always include TypeScript types — comments only when WHY is unclear
- Example: `/** Key that triggers the pop animation — defaults to value. Pass a stable key for live-updating values (e.g. streak) to avoid animating every second. */` (from StatCard props)

## Function Design

**Size:**
- Utility functions: 10-30 lines (pure, focused)
- React components: 50-200 lines (includes JSX, state, effects)
- Custom hooks: 20-100 lines (logic extraction from components)
- Store actions: 5-50 lines (state updates)

**Parameters:**
- Typed strictly with TypeScript
- Destructure when 3+ parameters: `function updateSession(state: SessionState, analysis: FocusAnalysis, intervalSeconds: number)`
- No optional parameters unless necessary; prefer overloads

**Return Values:**
- Explicit return type annotation always (`-> SessionState | null`)
- Union types for error cases or multiple possibilities
- No implicit `undefined` returns; use `null` for "not found/error" states

## Module Design

**Exports:**
- Named exports for utilities and functions
- Default export for React components
- Type-only imports: `import type { FocusAnalysis } from '@/lib/types'`

**Barrel Files:**
- Components have `index.ts` for common compound patterns; most export directly

**Stores (Zustand):**
- Single default export of store hook (e.g., `export const useSessionStore = create<StoreState>(...)`)
- Separate `@/lib/` utilities from store code
- Actions (functions) live inside `create()` callback

## Styling Patterns

**Tailwind + shadcn:**
- `.glass-card` utility class for all modal/card containers: `backdrop-blur-md bg-zinc-900/40 border border-zinc-800/50 rounded-2xl`
- Custom CSS variables in `globals.css` for theme colors (Orbitron font definition, ember colors)
- Dark mode forced: `darkMode: ['class']` in `tailwind.config.ts`
- No inline styles unless dynamic (state-driven via Framer Motion)

**Colors (Dark Ember Design System):**
- Background: `#0a0a0a` (near black)
- Cards: `bg-zinc-900/40` with `border-zinc-800/50`
- Text: `text-zinc-100` (light gray)
- Accent: `text-amber-400`, `text-emerald-500`, `text-red-500` (contextual)
- Flame states: CSS variables `--ember-orange`, `--flame-red`, `--flame-purple`, `--flame-blue`

**Font Usage:**
- **Orbitron** (Google Font): ALL numbers, scores, counters, game headings
  - Applied via `.text-game` class (defined in `globals.css`)
  - Examples: score display, streak badges, coin counters, FocusFlame streak/coin badges
- **Geist Sans** (Next.js default): body text, labels, descriptions

**Animations:**
- **Framer Motion** for all state-driven animations (transitions, springsm scale, opacity)
- **Lottie** for looped asset animations (flame, coin)
- **Tailwind animations** for simple, repeating patterns (ping, blink)
- Custom keyframes in `globals.css` for special effects (scan-line-move, ember-rise, crt-flicker)

## TypeScript Strict Mode

**Enabled:** `"strict": true` in `tsconfig.json`

**Practices:**
- No `any` type; always define interfaces
- `null` vs `undefined` distinction maintained (prefer `null` for "not found")
- All event handlers typed with React event types
- Callback prop types use `(arg: Type) => ReturnType` or `(arg: Type) => void`
- forwardRef components use explicit prop type: `interface ComponentProps { className?: never }` (see `WebcamCapture.tsx`)

## Zustand Store Pattern

**State Structure:**
- Ephemeral state (session, roasts, milestones) not persisted
- User stats (sessions, coins, achievements) persisted via `persist` middleware
- Actions defined inside `create()` callback with `(set, get) => ({...})`

**Store Access:**
- `useSessionStore()` from components for reactive updates
- `useSessionStore.getState()` inside callbacks/effects for current state (avoids stale closures)
- Separate concerns: `useSessionStore` (core logic), `useSettingsStore` (user preferences)

## Pure Functions (lib/focusEngine.ts)

**Requirements:**
- No side effects (no state mutation, no API calls, no I/O)
- Same input always produces same output
- Used for calculations: focus score, coin rewards, session summaries, milestone detection
- Immutable state updates: spread operator always creates new objects
- Prevents bugs: test-friendly, cacheable, concurrent-safe

**Example:**
```typescript
export function updateSession(
  state: SessionState,
  analysis: FocusAnalysis,
  intervalSeconds: number,
): SessionState {
  // Compute derived values
  const newHistory = [...state.analysisHistory, newEvent] // immutable
  // Return new state object (never mutate input)
  return { ...state, analysisHistory: newHistory, ... }
}
```

---

*Convention analysis: 2026-04-17*
