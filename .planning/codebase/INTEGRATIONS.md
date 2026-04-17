# External Integrations

**Analysis Date:** 2026-04-17

## APIs & External Services

**Vision AI:**
- Google Gemini 2.5 Flash - Focus detection from webcam frames
  - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
  - SDK/Client: Native fetch API (no SDK dependency)
  - Auth: Bearer token via NEXT_PUBLIC_GEMINI_API_KEY (public, rate-limited)
  - Implementation: `lib/gemini.ts` - analyzeFrame(), generateSessionReview()
  - Rate limit: 15 RPM (free tier) - app uses 12s interval = 5 RPM per session, well under limit
  - Request format: Multipart JSON with base64 image + text prompt
  - Response format: JSON with status (focused|distracted|away), confidence, distraction_type, roast message
  - Error handling: Returns null on failure, graceful fallback in UI

**Session Review Generation:**
- Google Gemini 2.5 Flash - Text-only prompt for end-of-session review
  - Same endpoint as frame analysis
  - Temperature: 0.8 for creative variety
  - Error fallback: Returns generic encouragement message if API fails

## Data Storage

**Databases:**
- Firebase Realtime Database (Firestore alternative)
  - Provider: Google Firebase
  - URL: https://focuslock-c9faf-default-rtdb.firebaseio.com
  - Client: firebase 12.10.0 package
  - Connection: Initialized in `lib/firebase.ts`
  - Use case: Multiplayer sessions, room syncing, leaderboards
  - Auth: Public key embedded (hardcoded Firebase config in `lib/firebase.ts`)
  - Operations: ref(), set(), onValue(), remove(), update(), push(), get()

**Client-Side Persistence:**
- localStorage - Via Zustand persist middleware
  - Key: 'focuslock-stats'
  - Data: UserStats (dayStreak, totalCoins, totalFocusMinutes, sessions[], achievements[], inventory[], themes, activeTheme)
  - Scope: Persists across browser sessions
  - Merge strategy: Deep merge with defaults in `stores/sessionStore.ts`

**File Storage:**
- Local filesystem only - No cloud storage
- Photo captures cached in memory via photoCapture module
- No persistent file uploads; captures are ephemeral

**Caching:**
- Browser cache - Static assets (Next.js automatic)
- Memory cache - Howler.js lazy-loads sound instances once, reuses across session
- In-memory state - Zustand store for active session, clears on returnToIdle

## Authentication & Identity

**Auth Provider:**
- Custom (no third-party provider)
  - Implementation: None - app is single-user per browser
  - Sessions stored locally in browser only
  - No user accounts or login required
  - Firebase config public - no authentication configured

## Monitoring & Observability

**Error Tracking:**
- None detected - Errors logged to console only

**Logs:**
- Browser console only
  - [gemini] prefix for API-related logs
  - [focusEngine] for state updates
  - [firebase] for database operations (if multiplayer active)
  - No persistent logging or analytics

**Debugging:**
- Next.js dev server console
- Browser DevTools Network tab for API calls
- localStorage inspection for state debugging

## CI/CD & Deployment

**Hosting:**
- Vercel (implied by Next.js 14.2.5 and git history "prepare for deployment")

**CI Pipeline:**
- None detected - No .github/workflows or CI config files

**Build Process:**
- `npm run build` → Next.js build
- `npm run start` → Production server
- `npm run dev` → Local development with hot reload
- ESLint runs on build (next lint)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_GEMINI_API_KEY` - Google Gemini 2.5 Flash API key
  - Must be set in `.env.local` (development) or Vercel dashboard (production)
  - Public prefix means it's exposed to client (acceptable for Gemini free tier with rate limits)
  - Example file: `.env.example`

**Optional env vars:**
- Firebase config can be moved from `lib/firebase.ts` hardcoded values to env vars (commented in .env.example)
  - NEXT_PUBLIC_FIREBASE_API_KEY
  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  - NEXT_PUBLIC_FIREBASE_DATABASE_URL
  - NEXT_PUBLIC_FIREBASE_PROJECT_ID
  - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  - NEXT_PUBLIC_FIREBASE_APP_ID

**Secrets location:**
- Development: `.env.local` (git-ignored, never committed)
- Production: Vercel Environment Variables dashboard
- Current status: Gemini key required, Firebase config hardcoded (not sensitive, public key)

## Webhooks & Callbacks

**Incoming:**
- None detected - No API routes for webhooks

**Outgoing:**
- None detected - No external webhook calls
- Tab visibility API uses browser-native visibilitychange event (not a webhook)

## Browser APIs & Client-Side Integration

**Webcam Capture:**
- navigator.mediaDevices.getUserMedia() - Request camera access
  - Implementation: `components/webcam/WebcamCapture.tsx`
  - Constraints: video { width: 640, height: 480 }
  - Error handling: Graceful degradation (denied, no-camera, loading states)
  - Output: HTMLCanvasElement.toDataURL('image/jpeg', 0.6) → base64 string
  - Cleanup: Stops MediaStream tracks on unmount

**Tab Visibility API:**
- document.visibilityState event listener
  - Implementation: `hooks/useSessionLoop.ts`
  - Use case: Detect when user switches tabs (counts as distraction if away >30s)
  - Penalty: Full distraction status + roast message
  - Payload: Generated by client, routed through Zustand

**Canvas Rendering:**
- HTMLCanvasElement.getContext('2d').drawImage() - Frame capture from video element
  - Creates JPEG snapshot at 60% quality for transmission to Gemini
  - Runs every 12 seconds during active session (configurable via settingsStore)

**localStorage API:**
- Zustand persist middleware wrapper
  - getItem('focuslock-stats') on app load
  - setItem('focuslock-stats', JSON.stringify(userStats)) on state change
  - Automatic merge/hydration with defaults

**Web Audio API:**
- Howler.js wrapper around HTML5 Audio
  - Lazy initialization - sounds created on first play, not import
  - Volume control via getSettings() from settingsStore
  - Global 300ms cooldown to prevent audio clipping
  - Error handling: try/catch swallows failures gracefully

## Session Synchronization

**Multiplayer Features:**
- Firebase Realtime Database integration
  - useMultiplayerStore (optional, loaded dynamically)
  - Sync operations: syncLocalState(), flushSync(), markIdle()
  - Called on processAnalysis and endSession if in room
  - Non-blocking try/catch (multiplayer is optional)

**Photo Capture:**
- captureMoment() from `lib/photoCapture.ts`
  - Stores analyzed frames in memory (reference: photoCapture module)
  - Cleared on returnToIdle
  - Used for session replay/history

---

*Integration audit: 2026-04-17*
