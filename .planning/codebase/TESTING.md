# Testing Patterns

**Analysis Date:** 2026-04-17

## Current State

**No tests exist.** This is a 12-hour hackathon project (HOTH 12, UCLA) with focus on core feature delivery rather than test coverage. No testing framework or test files are present in the codebase.

**Package.json Scripts:**
```bash
npm run dev      # Next.js dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint only — no tests
```

## Where Tests Would Live

If testing were to be implemented, follow this structure:

**Unit Tests (logic, hooks, utilities):**
- Location: `lib/__tests__/` or `hooks/__tests__/` or colocated as `*.test.ts`
- Example paths:
  - `lib/__tests__/focusEngine.test.ts` — test pure functions (calculateFocusScore, updateSession, calculateCoins)
  - `lib/__tests__/gemini.test.ts` — mock API calls, test error fallbacks
  - `hooks/__tests__/useSessionLoop.test.ts` — test webcam capture timing, tab visibility logic
  - `lib/__tests__/sounds.test.ts` — mock Howler.js, test play logic and cooldown

**Component Tests (integration):**
- Location: `components/**/__tests__/*.test.tsx`
- Example paths:
  - `components/flame/__tests__/FocusFlame.test.tsx`
  - `components/session/__tests__/SessionActive.test.tsx`

**Store Tests:**
- Location: `stores/__tests__/sessionStore.test.ts`

## Recommended Test Framework

For next iteration, use **Vitest** (lighter, faster than Jest for Next.js):

```bash
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

**Config: `vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

**Run Commands:**
```bash
vitest                 # Watch mode
vitest run             # Single run
vitest run --coverage  # Coverage report
```

## Test Structure Pattern

Based on codebase conventions, tests should follow this pattern:

**Pure Function Tests (lib/focusEngine.ts):**
```typescript
import { describe, it, expect } from 'vitest'
import { calculateFocusScore, createInitialState, updateSession } from '@/lib/focusEngine'
import type { SessionConfig, AnalysisEvent } from '@/lib/types'

describe('focusEngine', () => {
  describe('createInitialState', () => {
    it('should initialize session with correct defaults', () => {
      const config: SessionConfig = {
        duration: 25,
        lives: 3,
        taskDescription: 'Study math',
        allowedDevices: [],
        blockedSites: [],
      }
      const state = createInitialState(config)
      expect(state.isActive).toBe(true)
      expect(state.lives).toBe(3)
      expect(state.focusScore).toBe(100)
    })
  })

  describe('calculateFocusScore', () => {
    it('should calculate exponential decay over last 20 events', () => {
      const history: AnalysisEvent[] = Array(20).fill(null).map((_, i) => ({
        timestamp: Date.now() + i * 1000,
        status: 'focused',
        score: 100,
      }))
      const score = calculateFocusScore(history)
      expect(score).toBe(100)
    })

    it('should weight recent events more heavily', () => {
      const history: AnalysisEvent[] = [
        { timestamp: 0, status: 'focused', score: 100 },
        { timestamp: 1000, status: 'distracted', score: 20 },
      ]
      const score = calculateFocusScore(history)
      expect(score).toBeLessThan(100)
    })
  })

  describe('updateSession', () => {
    it('should increment streak on focused status', () => {
      const config: SessionConfig = {
        duration: 25,
        lives: 3,
        taskDescription: 'Study',
        allowedDevices: [],
        blockedSites: [],
      }
      const state = createInitialState(config)
      const nextState = updateSession(state, {
        status: 'focused',
        distraction_type: null,
        confidence: 0.95,
        roast: 'Keep going!',
      }, 12)
      expect(nextState.currentStreak).toBe(12)
    })

    it('should only penalize on NEW distraction (transition from focused)', () => {
      const config: SessionConfig = {
        duration: 25,
        lives: 3,
        taskDescription: 'Study',
        allowedDevices: [],
        blockedSites: [],
      }
      let state = createInitialState(config)
      
      // First distraction — lose a life
      state = updateSession(state, {
        status: 'distracted',
        distraction_type: 'phone',
        confidence: 0.9,
        roast: 'Phone detected!',
      }, 12)
      expect(state.lives).toBe(2)
      expect(state.distractionLog.length).toBe(1)
      
      // Second distraction (still distracted) — NO additional life loss
      state = updateSession(state, {
        status: 'distracted',
        distraction_type: 'phone',
        confidence: 0.9,
        roast: 'Still on phone!',
      }, 12)
      expect(state.lives).toBe(2) // Still 2, not 1
      expect(state.distractionLog.length).toBe(1) // Still 1 event
    })
  })
})
```

**API Mocking (lib/gemini.ts):**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeFrame } from '@/lib/gemini'
import type { SessionConfig, SessionContext } from '@/lib/types'

describe('gemini', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('analyzeFrame', () => {
    it('should return null on HTTP error', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      } as Response)

      const config: SessionConfig = {
        duration: 25,
        lives: 3,
        taskDescription: 'Study',
        allowedDevices: [],
        blockedSites: [],
      }
      const context: SessionContext = {
        sessionDuration: 25,
        focusScore: 100,
        livesRemaining: 3,
        totalLives: 3,
        currentStreak: 0,
        bestStreak: 0,
        distractionCount: 0,
      }

      const result = await analyzeFrame('base64image', config, context)
      expect(result).toBeNull()
    })

    it('should return null on JSON parse error', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'invalid json' }] } }] }),
      } as Response)

      const config: SessionConfig = { /* ... */ }
      const context: SessionContext = { /* ... */ }
      
      const result = await analyzeFrame('base64image', config, context)
      expect(result).toBeNull()
    })

    it('should downgrade low-confidence distraction to focused', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  status: 'distracted',
                  distraction_type: 'phone',
                  confidence: 0.7,
                  roast: 'Maybe phone?',
                }),
              }],
            },
          }],
        }),
      } as Response)

      const config: SessionConfig = { /* ... */ }
      const context: SessionContext = { /* ... */ }
      
      const result = await analyzeFrame('base64image', config, context)
      expect(result?.status).toBe('focused')
      expect(result?.distraction_type).toBeNull()
    })
  })
})
```

**Hook Tests (hooks/useSessionLoop.ts):**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSessionLoop } from '@/hooks/useSessionLoop'
import { useSessionStore } from '@/stores/sessionStore'
import * as gemini from '@/lib/gemini'

vi.mock('@/lib/gemini')
vi.mock('@/stores/sessionStore')

describe('useSessionLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('should capture frames at configured interval', async () => {
    const mockCaptureFrame = vi.fn(() => 'base64frame')
    const mockWebcamRef = { current: { captureFrame: mockCaptureFrame } }

    vi.mocked(useSessionStore).mockReturnValue({
      appState: 'active',
      isAnalyzing: false,
      // ... other store state
    } as any)

    renderHook(() => useSessionLoop(mockWebcamRef as any))

    vi.advanceTimersByTime(12_000) // First capture interval
    expect(mockCaptureFrame).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(12_000) // Second interval
    expect(mockCaptureFrame).toHaveBeenCalledTimes(2)
  })

  it('should handle tab visibility changes', async () => {
    const mockProcessAnalysis = vi.fn()
    vi.mocked(useSessionStore).mockReturnValue({
      appState: 'active',
      session: { /* ... */ },
      processAnalysis: mockProcessAnalysis,
      // ...
    } as any)

    renderHook(() => useSessionLoop({ current: { captureFrame: () => null } }))

    // Simulate tab hidden
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))

    // Simulate tab visible after 10 seconds (short absence)
    vi.advanceTimersByTime(10_000)
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))

    expect(mockProcessAnalysis).toHaveBeenCalledWith(expect.objectContaining({
      status: 'focused',
      distraction_type: null,
    }))
  })
})
```

**Component Tests:**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import FocusFlame from '@/components/flame/FocusFlame'
import '@testing-library/jest-dom'

describe('FocusFlame', () => {
  it('should render with flame in idle state', () => {
    render(<FocusFlame state="idle" intensity={50} streak={0} coins={0} />)
    const container = screen.getByRole('img', { hidden: true })
    expect(container).toBeInTheDocument()
  })

  it('should show streak badge when streak > 0', () => {
    const { rerender } = render(<FocusFlame state="idle" intensity={50} streak={0} coins={0} />)
    expect(screen.queryByText(/🔥/)).not.toBeInTheDocument()

    rerender(<FocusFlame state="idle" intensity={50} streak={300} coins={0} />)
    expect(screen.getByText('🔥 300')).toBeInTheDocument()
  })
})
```

**Store Tests:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore } from '@/stores/sessionStore'
import type { SessionConfig } from '@/lib/types'

describe('sessionStore', () => {
  beforeEach(() => {
    // Reset store state
    useSessionStore.setState({ session: null, appState: 'idle' })
  })

  it('should start session with config', () => {
    const config: SessionConfig = {
      duration: 25,
      lives: 3,
      taskDescription: 'Study',
      allowedDevices: [],
      blockedSites: [],
    }
    
    useSessionStore.getState().startSession(config)
    const { session, appState } = useSessionStore.getState()
    
    expect(appState).toBe('active')
    expect(session?.lives).toBe(3)
    expect(session?.config.duration).toBe(25)
  })

  it('should persist userStats', () => {
    const { userStats } = useSessionStore.getState()
    expect(userStats.dayStreak).toBeDefined()
    expect(userStats.totalCoins).toBeGreaterThanOrEqual(0)
  })
})
```

## Mocking Strategy

**What to Mock:**
- External APIs (Gemini): return canned responses or errors
- Browser APIs: `navigator.mediaDevices`, `document.visibilityState`, `fetch()`
- Howler.js sound library: mock play() calls, avoid actual audio
- Zustand store: use `vi.mocked()` or provide test state directly

**What NOT to Mock:**
- Pure utility functions (focusEngine): test directly without mocks
- Tailwind/CSS: skip style assertions entirely, test DOM presence only
- Date/Time calculations: use `vi.useFakeTimers()` for controlled advancement
- Framer Motion animations: test that components render, skip animation assertion

**Example Mock Pattern (Vitest):**
```typescript
import { vi } from 'vitest'

// Mock Howler.js
vi.mock('howler', () => ({
  Howl: vi.fn(() => ({
    play: vi.fn(),
    volume: vi.fn(),
    stop: vi.fn(),
  })),
}))

// Mock Zustand store
vi.mock('@/stores/sessionStore', () => ({
  useSessionStore: vi.fn(() => ({
    session: null,
    appState: 'idle',
    startSession: vi.fn(),
  })),
}))

// Mock fetch
global.fetch = vi.fn((url: string) => {
  if (url.includes('generativelanguage.googleapis.com')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '{}' }] } }],
      }),
    })
  }
  return Promise.reject(new Error('Not mocked'))
})
```

## Fixtures and Factories

**Test Data Builders:**
```typescript
// vitest.setup.ts
export function createMockSessionConfig(overrides = {}): SessionConfig {
  return {
    duration: 25,
    lives: 3,
    taskDescription: 'Study math',
    allowedDevices: [],
    blockedSites: [],
    ...overrides,
  }
}

export function createMockSessionState(config = createMockSessionConfig()) {
  return createInitialState(config)
}

export function createMockFocusAnalysis(overrides = {}): FocusAnalysis {
  return {
    status: 'focused',
    distraction_type: null,
    confidence: 0.95,
    roast: 'Keep going!',
    ...overrides,
  }
}
```

**Location:** `vitest.setup.ts` (imported in test files as needed)

## Coverage Goals

Since this is a hackathon project, prioritize tests for:

**High Priority (test if added):**
- `lib/focusEngine.ts` — Pure functions, core game logic, no dependencies
- `lib/gemini.ts` — Error handling, confidence threshold filtering
- `lib/sounds.ts` — Cooldown logic, error handling
- Tab visibility detection in `useSessionLoop`

**Medium Priority:**
- Component rendering (presence, not styles)
- Store initialization and basic actions
- Hook logic (intervals, cleanup)

**Low Priority:**
- UI animations (Framer Motion, Lottie)
- CSS classes and styling
- Accessibility attributes (live apps test separately)

## Notes for Future

- Start with `lib/focusEngine.test.ts` — easy wins, zero dependencies
- Use Vitest snapshot tests only for JSON responses (gemini, shop items)
- E2E tests via Cypress or Playwright if deployed testing needed
- No snapshot tests on React components (brittle, verbose diffs)
- Keep test names descriptive: "should increment streak on focused status" not "should update"

---

*Testing analysis: 2026-04-17*
