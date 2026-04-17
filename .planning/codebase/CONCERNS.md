# Codebase Concerns

**Analysis Date:** 2026-04-17

## Security

**Exposed Gemini API Key (Hackathon-Critical):**
- Issue: `NEXT_PUBLIC_GEMINI_API_KEY` hardcoded in `.env.local` and exposed in browser
- Files: `lib/gemini.ts` (line 6), `.env.local`
- Impact: Anyone can extract the key from network traffic or client bundle and exhaust the API quota (15 RPM free tier). Malicious actors can abuse the vision API.
- Risk Level: **High** for production, acceptable for hackathon (time-limited app)
- Mitigation in place: Free tier rate limits mitigate mass abuse
- Fix approach: Move Gemini API calls to backend Next.js API route (`/api/analyze-frame`) when deploying. The route should validate session state server-side before calling Gemini. Requires moving `analyzeFrame()` and `generateSessionReview()` to server-side only.

**Firebase Config Exposed (Low-Risk):**
- Issue: Firebase config (apiKey, databaseURL, projectId) hardcoded in `lib/firebase.ts` (lines 4-12)
- Files: `lib/firebase.ts`
- Impact: Config is public; Firebase security rules must enforce authorization. Currently allows read/write to `rooms/{roomCode}/players/{playerId}` based on room existence.
- Risk Level: **Low** if Firestore/RTDB rules are strict (not verified in codebase)
- Recommendation: Verify Firebase security rules in Firebase console. Consider using Firebase Auth instead of random `playerId` generation for multiplayer rooms.

**Photo Capture & localStorage (Privacy):**
- Issue: Base64-encoded webcam frames stored in memory via `captureMoment()` and sessionStorage/localStorage for "Caught in the Act" cards
- Files: `lib/photoCapture.ts`, `components/session/SessionActive.tsx` (line 354), `components/session/CaughtCard.tsx` (lines 55-70)
- Impact: User webcam photos persisted locally. No explicit user consent modal before capturing or storing. GDPR/privacy concern for EU users.
- Risk Level: **Medium** for production, acceptable for hackathon with clear user disclosure
- Fix approach: Add explicit opt-in permission modal on session start. Clear photo storage on app exit. Add privacy policy section explaining photo retention.

---

## Tech Debt

**Stale Closure Risks in useSessionLoop (setInterval pattern):**
- Issue: `useSessionLoop.ts` uses `getState()` inside setInterval callbacks (lines 89-97), which can read stale store state if store updates don't flush properly
- Files: `hooks/useSessionLoop.ts` (lines 89-97)
- Problem: `useSessionStore.getState()` inside interval callbacks captures state at callback definition time, not execution time. If Zustand's persist middleware delays, the session check can miss the end condition.
- Current mitigation: `loopRef.current` gate (line 29) prevents runTick after appState changes, but timing window exists
- Fix approach: Refactor to pull live state on each tick: `const { session } = useSessionStore.getState()` at start of `runTick()`, not in interval setup. Add debug log to detect stale reads.

**Tab Visibility Timing Edge Case:**
- Issue: Tab visibility penalty (30s threshold) uses `Date.now()` but doesn't account for system clock skew or tab background suspension
- Files: `hooks/useSessionLoop.ts` (lines 49-78)
- Problem: Browser can pause timers when tab is backgrounded. On return, elapsed time can be artificially inflated, triggering full distraction penalty incorrectly.
- Example: User switches tabs for 5s but browser was suspended → system clock gap makes it seem like 40s
- Fix approach: Use `performance.now()` relative to `document.visibilityState === 'hidden'` timestamp, then validate against `document.hidden` state on return.

**prevLivesRef Pattern Anti-Pattern:**
- Issue: `SessionActive.tsx` (memory) mentions `prevLivesRef` pattern to detect life-loss triggers animation
- Files: `components/session/SessionActive.tsx` (implied in animation triggering)
- Problem: Comparing refs to detect state changes is fragile and hard to debug. React deps arrays don't catch ref mutations.
- Better approach: Leverage Zustand's state change subscription instead. Use `useShallow()` or derive life-loss from `session.livesLost` count directly.

---

## Performance

**Gemini API Cadence at Theoretical Limit:**
- Issue: 12-second capture interval (6 RPM) is safe under 15 RPM free tier, but leaves no margin
- Files: `lib/focusEngine.ts` (line 33), `stores/sessionStore.ts` (line 132), `hooks/useSessionLoop.ts` (line 89)
- Problem: If a single Gemini call hangs or retries, the next tick fires anyway. Back-to-back requests could exceed quota.
- Current status: `isAnalyzing` flag (sessionStore.ts) prevents parallel requests, but doesn't skip ticks
- Fix approach: Implement exponential backoff retry logic in `analyzeFrame()`. If a call takes >10s, skip next tick. Add Gemini error monitoring to alert on 429 (quota).

**JPEG Quality 0.6 Compression (Privacy/Accuracy Tradeoff):**
- Issue: `WebcamCapture.tsx` (line 68) encodes frames as JPEG with 0.6 quality
- Files: `components/webcam/WebcamCapture.tsx` (line 68)
- Trade-off: Reduces bandwidth (~30KB per frame) but Gemini vision API accuracy may degrade on blurry face detection. Distraction misclassification risk.
- Recommendation: A/B test 0.6 vs 0.8 quality. Monitor confidence scores in production. Document empirical accuracy.

**Large Component Files (Single Responsibility Violation):**
- Issue: `SessionSummary.tsx` (685 lines), `MultiplayerDashboard.tsx` (592 lines), `AnalyticsDashboard.tsx` (590 lines) are monolithic
- Files: `components/session/SessionSummary.tsx`, `components/multiplayer/MultiplayerDashboard.tsx`, `components/analytics/AnalyticsDashboard.tsx`
- Impact: Hard to test, high change impact surface area, animation/state logic tangled
- Fix approach: Extract grade reveal logic to separate components per grade (already done: `reveals/SRankReveal.tsx`, etc.). Extract stats rows to sub-components. Break up dashboard grids.

**No Performance Monitoring:**
- Issue: Gemini API latency, frame capture timing, animation frame drops not instrumented
- Files: All
- Impact: Can't detect performance regression on production. API slowdowns undetected.
- Recommendation: Add `performance.mark()` / `performance.measure()` around Gemini calls. Use web-vitals library to track interaction/layout shift during sessions.

---

## Fragile Areas

**focusEngine.ts updateSession Pure Function Boundary (Unclear):**
- Issue: `updateSession()` is marked pure but depends on `analysisHistory` array mutation pattern
- Files: `lib/focusEngine.ts` (lines 68-120)
- Problem: `newHistory = [...state.analysisHistory, newEvent]` creates new array (good), but `calculateFocusScore(newHistory)` window of last-20 is implicit. No guard if history grows unbounded.
- Risk: If `analysisHistory` ever gets filled with fast ticks, memory bloat. Score calc becomes O(n) instead of O(20).
- Fix: Cap `analysisHistory` to last 1000 events. Document focus score window clearly.

**DistractionLog Index Collision Risk:**
- Issue: `photoCapture.ts` uses `Date.now()` as unique ID for moments (`caught-${now}`, `focused-${now}`)
- Files: `lib/photoCapture.ts` (lines 19, 30)
- Problem: Two frames captured in same millisecond = colliding IDs. Overwrites previous in display logic.
- Likelihood: Low at 12s intervals, but possible under system load or clock adjustments
- Fix: Use `crypto.randomUUID()` or append a counter to `Date.now()`.

**localStorage Persistence Without Schema Versioning:**
- Issue: Zustand persist middleware in `sessionStore.ts` saves entire `UserStats` to `focuslock-stats`, no version field
- Files: `stores/sessionStore.ts`, `stores/multiplayerStore.ts` (lines 57-58)
- Problem: If you add/remove fields in `UserStats` type, old localStorage data silently breaks or gets corrupted. No migration path.
- Example: Upgrade adds new achievement field → old saves don't have it → runtime errors or stale data
- Fix: Add `schemaVersion: 1` to `UserStats`. Implement `migrate()` function in persist config. Document breaking changes.

**Modal Cascading (Shop/Settings/Lobby/Analytics):**
- Issue: `app/page.tsx` renders 5+ overlays (shop, lobby, settings, analytics) with separate `useState` booleans
- Files: `app/page.tsx` (lines 89-91)
- Problem: No centralized modal state. Can open multiple at once (shop + settings simultaneously). z-index conflicts possible.
- Fix: Use a single `openModal: string | null` state in sessionStore. Render one modal at a time.

**Race Condition: Session End vs Gemini Response:**
- Issue: `useSessionLoop.ts` calls `endSession()` on timer tick (line 96) and inside `runTick()` (line 42)
- Files: `hooks/useSessionLoop.ts` (lines 42, 96), `stores/sessionStore.ts` (lines 197-296)
- Problem: If Gemini returns a life-losing distraction at exact end time, both code paths can call `endSession()` twice. Zustand may double-record session.
- Likelihood: Very low (race window <1s), but possible
- Fix: Set a `session.isEnding` flag inside `endSession()`. Abort `runTick()` and `processAnalysis()` if already ending.

**Achievement Unlock Logic Timing (Post-Session Only):**
- Issue: Achievements computed in `sessionStore.ts` `endSession()` action (line 262), not during session
- Files: `stores/sessionStore.ts` (lines 262-272)
- Problem: If user manually refreshes page mid-session, achievements already earned are lost (session data cleared but store persisted). Edge case but user-visible.
- Recommendation: For production, persist temporary session state to localStorage with a "Resume" button.

---

## Known Bugs

**Gemini Confidence Threshold Bypass:**
- Issue: `lib/gemini.ts` (lines 111-114) downgrades low-confidence distraction to focused
- Files: `lib/gemini.ts` (lines 111-114)
- Behavior: `status: 'distracted', confidence: 0.5` → returns `status: 'focused'` instead
- Bug: Silently changes response status without logging original confidence. AI roast still references distraction.
- Fix: Return original analysis, let `updateSession()` decide threshold. Or log downgrade with original confidence.

---

## Missing Critical Features

**No Session Pause Persistence:**
- Issue: `pauseSession()` sets `appState: 'paused'` and `session.isPaused: true`, but pause state not persisted
- Files: `stores/sessionStore.ts` (lines 185-195)
- Problem: If user pauses, navigates away, and refreshes → session lost. Pause timer resets on reload.
- Recommended: Persist `session` and `appState` to sessionStorage. Restore on app mount with "Resume Session?" modal.

**No Rate Limiting on Gemini Calls:**
- Issue: Gemini endpoint has 15 RPM free tier quota but no client-side rate limiting
- Files: `lib/gemini.ts`
- Problem: If capture interval is manually set to <1s, could hit quota. No safeguard.
- Fix: Clamp `captureInterval` to minimum 6 seconds. Add quota remaining tracker from Gemini headers.

**No Webcam Fallback (Desktop-Only):**
- Issue: If webcam init fails, session cannot start (no "analyze without camera" mode)
- Files: `components/webcam/WebcamCapture.tsx` (lines 85-104)
- Problem: Accessibility issue. Users with camera hardware errors locked out.
- Recommendation: Add "Skip Camera Check" mode for keyboard/input-based study (less accurate but works).

**No Error Boundary for Lottie Animations:**
- Issue: Lottie animation failures in `FocusFlame.tsx` not caught
- Files: `components/flame/FocusFlame.tsx`
- Problem: Bad animation JSON or render error crashes entire flame component, breaks UI
- Fix: Wrap Lottie in `ErrorBoundary` or `try/catch` in render

---

## Test Coverage Gaps

**Gemini API Integration Untested:**
- What's not tested: `analyzeFrame()` and `generateSessionReview()` functions
- Files: `lib/gemini.ts`
- Risk: API changes, prompt injection, malformed responses crash silently
- Recommendation: Add unit tests with mocked fetch. Test confidence threshold logic.

**focusEngine State Transitions Untested:**
- What's not tested: `updateSession()` state machine (focused → distracted → away), streak resets, life loss logic
- Files: `lib/focusEngine.ts`
- Risk: Bugs in score calculation, streak logic, or comeback detection go undetected
- Recommendation: Write snapshot tests for `updateSession()` with various sequences.

**Zustand Store Persistence Untested:**
- What's not tested: localStorage persist/hydrate, data schema migrations, concurrent store updates
- Files: `stores/sessionStore.ts`, `stores/multiplayerStore.ts`
- Risk: Data corruption on version upgrade, race conditions in multiplayer sync
- Recommendation: Mock localStorage. Test hydration after clear. Test concurrent actions.

**User Interaction Flows Untested:**
- What's not tested: End-to-end flows like "Start → Distraction → Life Lost → Roast Toast → Resume → End Session"
- Files: All components, hooks, stores
- Risk: Animations, audio, state transitions have subtle timing bugs
- Recommendation: Add integration tests with Cypress/Playwright for key flows.

---

## Hackathon-Specific Shortcuts (To Address Pre-Production)

**next.config.mjs Format (Not .ts):**
- Issue: Next.js 14 requires `.mjs` config, not `.ts`. This is documented in CLAUDE.md but easy to break.
- Files: `next.config.mjs` (must stay .mjs)
- Recommendation: Document in README. Flag in CI if someone commits `next.config.ts`.

**Hard-Coded Theme System (Single Source of Truth Missing):**
- Issue: Flame colors defined in CSS vars (`--flame-red`, `--flame-purple`) and shadcn tokens, but theme shop code in `lib/themes.ts` has separate color logic
- Files: `app/globals.css`, `lib/themes.ts`, `components/flame/FocusFlame.tsx`
- Risk: Theme changes inconsistent across UI if not updated in all places
- Fix: Move all theme colors to single `lib/themes.ts` export, import in globals.css.

**No Request Validation (Client-Side Only):**
- Issue: Gemini requests assume valid base64, SessionConfig valid on line 74
- Files: `lib/gemini.ts`, `hooks/useSessionLoop.ts`
- Risk: Malformed data crashes Gemini API silently
- Recommendation: Add `FocusAnalysis | error` type. Validate responses with Zod or simple guards.

**Audio Cooldown Global State (Mutable):**
- Issue: `lib/sounds.ts` line 1 uses global mutable `lastSoundTime` variable
- Files: `lib/sounds.ts`
- Problem: 300ms cooldown applies to ALL sounds globally. Can't play burn + coin simultaneously.
- Better: Zustand store with per-sound tracking or use HTMLAudioElement native timing.

---

## Recommendations Priority

**High (Before Production Deployment):**
1. Move Gemini API to backend route
2. Add explicit photo capture consent modal
3. Fix stale closure risks in useSessionLoop
4. Implement session pause persistence
5. Add Lottie error boundary

**Medium (Quality of Life):**
1. Break up large components (>400 lines)
2. Add performance monitoring
3. Add localStorage schema versioning
4. Fix tab visibility timing edge case
5. Centralize modal state

**Low (Nice to Have):**
1. A/B test JPEG quality impact
2. Document Gemini confidence thresholds
3. Add webcam fallback mode
4. Refactor sounds global state

---

*Concerns audit: 2026-04-17*
