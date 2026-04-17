# Architecture

**Analysis Date:** 2026-04-17

## Pattern Overview

**Overall:** Client-side React with Next.js 14 App Router, powered by a pure functional focus engine and Zustand state management. Gemini Vision API evaluates webcam frames every 12 seconds to detect focus/distraction, which flows through the state store and triggers UI updates, sounds, and analytics.

**Key Characteristics:**
- **Unidirectional data flow**: UI → user action → Zustand store → pure focus engine → store → UI (React hooks)
- **Separation of concerns**: API integration (lib/gemini.ts), pure business logic (lib/focusEngine.ts), state (stores/sessionStore.ts), components (display + interaction)
- **Frame analysis loop**: 12-second capture interval (configurable) via `useSessionLoop` hook, well under Gemini's 15 RPM limit
- **Immutable session state**: `updateSession()` returns new SessionState, never mutates in place
- **Multi-store architecture**: sessionStore (core game loop), settingsStore (user preferences), multiplayerStore (study rooms)

## Layers

**Presentation (UI):**
- Purpose: Render flame state, session HUD, modals, animations, toasts
- Location: `components/` (flame, session, gamification, animations, effects, settings, analytics, multiplayer)
- Contains: React components with Framer Motion animations, Recharts visualizations, Tailwind styling
- Depends on: useSessionStore, useFlameState, useBackgroundSound, lib/sounds, lib/themes
- Used by: app/page.tsx (router center), SessionActive (full HUD)

**State Management:**
- Purpose: Hold game state, user stats, session data; dispatch actions; persist to localStorage
- Location: `stores/sessionStore.ts`, `stores/settingsStore.ts`, `stores/multiplayerStore.ts`
- Contains: Zustand stores with persist middleware, action creators
- Depends on: lib/focusEngine, lib/achievements, lib/sounds
- Used by: All components via useSessionStore, useSettingsStore, useMultiplayerStore hooks

**Business Logic (Pure Functions):**
- Purpose: Calculate focus scores, update session stats, determine milestones, compute coin rewards
- Location: `lib/focusEngine.ts`
- Contains: createInitialState, calculateFocusScore, updateSession, calculateCoins, getSessionSummary, checkMilestone
- Depends on: lib/types only (no side effects)
- Used by: sessionStore (in actions)

**API Integration:**
- Purpose: Communicate with Gemini Vision API for frame analysis and session reviews
- Location: `lib/gemini.ts`
- Contains: analyzeFrame (POST image + prompt to Gemini, parse JSON), generateSessionReview
- Depends on: NEXT_PUBLIC_GEMINI_API_KEY env var, lib/types
- Used by: useSessionLoop hook (every 12s during active session)

**Hooks (Session Loop):**
- Purpose: Manage webcam capture interval, tab visibility detection, session duration timer
- Location: `hooks/useSessionLoop.ts`, `hooks/useFlameState.ts`, `hooks/useBackgroundSound.ts`
- Contains: Ref-based loop control, visibility/focus change listeners, frame capture orchestration
- Depends on: useSessionStore, WebcamHandle, lib/gemini, lib/photoCapture
- Used by: SessionActive (main loop), FocusFlame (flame animation state)

**Infrastructure:**
- Purpose: Webcam access, sound playback, image capture, theme/shop logic, achievements, Firebase (optional)
- Location: `lib/` (webcam, sounds, achievements, shop, themes, rooms, backgroundAudio, etc.)
- Contains: Howler.js sound wrappers, Camera API utilities, localStorage helpers
- Depends on: External APIs (Howler.js, web Webcam API, Firebase if enabled)
- Used by: Components and hooks

## Data Flow

**Session Start:**

1. User clicks "Start Session" button (app/page.tsx)
2. openSetup() sets appState→'setup', renders SessionSetup modal
3. User configures: task description, duration, lives, allowed devices
4. onStart() calls startSession(config) → sessionStore.startSession()
5. sessionStore creates initial SessionState via createInitialState(config)
6. appState transitions to 'active', SessionActive component mounts
7. useSessionLoop hook starts, sets loopRef.current = true

**Active Session (Webcam Analysis Loop):**

1. useSessionLoop every 12s (captureInterval):
   - captureFrame() from WebcamCapture ref → base64 JPEG
   - buildContext(session) extracts: focusScore, lives, streak, distraction count
   - analyzeFrame(base64, config, context) → fetch to Gemini v1beta endpoint
   - Gemini returns JSON: {status, distraction_type, confidence, roast}
   - processAnalysis(analysis) dispatched to sessionStore

2. sessionStore.processAnalysis():
   - Calls updateSession(state, analysis, intervalSeconds) → pure function
   - updateSession returns new SessionState with:
     - Updated focusScore (exponential decay over last 20 analyses)
     - Streak incremented if focused, reset to 0 if distracted/away
     - Lives decremented if NEW distraction (state was focused, now distracted/away)
     - analysisHistory appended with new event
   - checkMilestone(oldState, newState) checks for milestones (focus streaks, comebacks)
   - Store updates: session, latestRoast, latestMilestone
   - Sounds play: playLifeLost (on life loss), playNudge (on roast)

3. SessionActive UI re-renders via hooks:
   - useFlameState derives flame visual from focusScore, intensity
   - StatCard animateKey updates trigger pop animations
   - Heart animation on life loss
   - RoastToast displays latestRoast message

**Tab Visibility Handling:**

- useSessionLoop listens to 'visibilitychange' event
- If tab hidden during active session → record hiddenAtRef
- Tab becomes visible → check elapsed time:
  - If >30s absent → processAnalysis as 'distracted', lose life
  - If ≤30s absent → processAnalysis as 'focused', no penalty (warning only)

**Session End:**

1. User clicks "End Session" OR lives reach 0 (auto-end)
2. endSession() action in sessionStore:
   - Calls getSessionSummary(session) → pure function
   - Creates SessionSummaryData with: totalMinutes, focusPercentage, bestStreak, coinsEarned
   - calculateCoins(session) = 10 + focusedMinutes×1 + lives×5 + (focusRate>0.8)×10 + (noLives)×20
   - Generates AI review via generateSessionReview(summary, config)
   - checkAchievements(summary, userStats) unlocks badges
   - appState → 'summary', SessionSummary component mounts with summary data
   - userStats updated: totalSessions++, totalFocusMinutes += time, totalCoins += earned
   - Session saved to userStats.sessions array (persisted via localStorage)

**State Persistence:**

- sessionStore wrapped in Zustand persist() middleware
- userStats persisted to localStorage key 'focuslock-stats'
- On app reload, previous sessions, coins, achievements restored

## Key Abstractions

**FocusFlame (Flame Component):**
- Purpose: Visual representation of focus state and intensity
- Examples: `components/flame/FocusFlame.tsx`
- Pattern: Lottie animation (Fire.json) driven by FlameState enum (idle, focused, distracted, onfire) + intensity (0-100). Framer Motion controls playback speed, scale, red flash on life loss.

**SessionState (Game State):**
- Purpose: Encapsulates all session data (config, timing, focus metrics, lives, history)
- Examples: `lib/types.ts` SessionState interface
- Pattern: Immutable updates via updateSession(), allowing pure function composition and time-travel debugging.

**FocusAnalysis (AI Response):**
- Purpose: Gemini Vision output normalized to app domain
- Examples: `lib/types.ts` FocusAnalysis interface
- Pattern: {status: 'focused'|'distracted'|'away', distraction_type: '...' | null, confidence: 0-1, roast: string}. Confidence filter: distracted requires ≥0.85, away always accepted.

**SessionContext (AI Prompt Data):**
- Purpose: Context passed to Gemini prompt to enable adaptive roasts
- Examples: `hooks/useSessionLoop.ts` buildContext()
- Pattern: {focusScore, livesRemaining, currentStreak, distractionCount}. Roast intensity escalates with distractionCount (0→gentle, 1-2→sarcastic, 3+→savage).

**StatCard (Reusable UI Pattern):**
- Purpose: Display live-updating game metrics (streak, coins, focus score)
- Examples: `components/session/SessionActive.tsx` StatCard component
- Pattern: Animates on value change via animateKey prop. Stable key prevents animation every tick; only animates on Gemini tick (real state change).

## Entry Points

**`app/layout.tsx`:**
- Location: `/Users/jollenshoulddai/Desktop/FocusLock/app/layout.tsx`
- Triggers: Server-side SSR, wraps entire app
- Responsibilities: Import Orbitron + Geist fonts, set dark class, embed ClickParticles background effect, render children (page.tsx)

**`app/page.tsx`:**
- Location: `/Users/jollenshoulddai/Desktop/FocusLock/app/page.tsx`
- Triggers: App router root, client-side 'use client'
- Responsibilities: Router (appState → idle/setup/active/summary/analytics), render FocusFlame hero, streak/coins display, Start Session button, session history, modals (Shop, RoomLobby, Settings). Manages transient UI state: showShop, showLobby, showSettings, showEmbers. Orchestrates Framer Motion AnimatePresence for page transitions.

**`components/session/SessionActive.tsx`:**
- Location: `/Users/jollenshoulddai/Desktop/FocusLock/components/session/SessionActive.tsx`
- Triggers: Rendered when appState === 'active' or 'paused'
- Responsibilities: Full HUD during session. Mounts useSessionLoop (webcam capture loop). Displays: hearts (lives), countdown timer, focus flame, stats cards, webcam preview, roast toast, Recharts focus timeline, pause/resume/end buttons. GAME OVER overlay auto-hides after 1.5s.

**`hooks/useSessionLoop.ts`:**
- Location: `/Users/jollenshoulddai/Desktop/FocusLock/hooks/useSessionLoop.ts`
- Triggers: useEffect when appState becomes 'active'
- Responsibilities: Start 12-second Gemini analysis interval loop. Capture frame → analyzeFrame → processAnalysis. Monitor tab visibility (hidden→away penalty). Check session duration every 1s, auto-end when time expires. Return { isAnalyzing } for UI feedback.

## Error Handling

**Strategy:** Fail gracefully. Gemini API errors return null (analysis skipped), session continues. Sound errors caught in try/catch, app never breaks. localStorage failures fall back to in-memory state.

**Patterns:**
- `lib/gemini.ts` analyzeFrame() wraps in try/catch, logs error, returns null
- `lib/sounds.ts` all Howler.js calls wrapped in try/catch
- useSessionLoop: if frame capture fails, runTick() returns early, next tick retries
- sessionStore: if processAnalysis() fails, store remains intact (no mutation)

## Cross-Cutting Concerns

**Logging:** console.error/log for debugging (Gemini API, frame capture, analysis). No structured logging library.

**Validation:** Gemini response parsed as JSON, typed as FocusAnalysis. Confidence threshold (0.85 for distracted) enforced. SessionConfig validated implicitly by startSession().

**Authentication:** App-level: none. Gemini API: NEXT_PUBLIC_GEMINI_API_KEY in .env. Firebase (if enabled): via lib/firebase.ts.

**Sound:** Howler.js lazy initialization. Global 300ms cooldown to prevent sound spam. Wired via sessionStore actions: playLifeLost, playNudge, playMilestone.

**Theme/Customization:** Active theme (FlameTheme) drives background color, glow, flame particle colors. Selected via Shop, stored in userStats.activeTheme. Themes apply via lib/themes.ts getTheme().

---

*Architecture analysis: 2026-04-17*
