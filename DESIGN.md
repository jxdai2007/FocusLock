# Design System — FocusLock

**Codename:** Dark Ember: Cinematic Cut
**Version:** 1.0
**Created:** 2026-04-17
**Status:** Source of truth. Read before any visual or UI decision.

---

## Product Context

- **What this is:** AI-powered study accountability webapp. Webcam + Gemini Vision detect focus loss, lives system penalizes distraction, gamified with streaks/coins/roasts.
- **Who it's for:** Students studying solo who need external accountability. Primary target: HOTH 12 (UCLA) hackathon demo, then general student audience.
- **Space/industry:** Productivity / study / gamified habit tracking. Peers: Forest, Finch, Habitica, Flora, Focusmate.
- **Project type:** Web app (Next.js 14, Vercel-deployed). Dashboard/HUD-heavy, not marketing-site-heavy.

---

## Visual Thesis

A focus room built from heat. Dark void + reactive ember light + sci-fi HUD. Not a SaaS dashboard with flame icons — a cockpit that burns hotter as you lock in.

Target emotional reaction in first 3 seconds: "this is a game I'm about to lose."

---

## Aesthetic Direction

- **Direction:** Dark Ember — sci-fi HUD cockpit with cinematic moments
- **Decoration level:** Intentional. Film grain + scan lines + ember particles + reactive glow. Never decorative-for-decoration.
- **Mood:** EA Sports broadcast meets Apollo mission control. Tight, dark, hot.
- **Differentiation from category:**
  - Most study apps (Forest, Finch) are soft, warm, pet-care. FocusLock is hostile, cinematic, broadcast.
  - Most gamified productivity (Habitica) is pixel-art retro. FocusLock is HUD/sci-fi modern.
  - The flame isn't an icon — it's a reactive light source that scales with focus state.

---

## Typography

### Fonts
| Role | Font | Weight | Loading |
|---|---|---|---|
| **Cinematic** (grade reveal, GAME OVER, section titles) | Bungee | 400 | Google Fonts |
| **Display / HUD** (timer, stats, counters, chips) | Orbitron | 500, 600, 700 | Google Fonts (existing) |
| **Body** (task desc, modals, settings, hero copy) | Geist Sans | 300-700 | Next.js default |
| **Mono / Debug** (timestamps, "caught" logs) | Geist Mono | 400, 500 | Next.js |

**Banned:** Inter, Roboto, Poppins, Montserrat as primary display. Papyrus, Comic Sans, Lobster, Impact for anything.

**All numbers MUST use tabular-nums.** This is non-negotiable. Counter jitter kills the HUD feel.

### Modular scale (px)
| Token | Size | Use |
|---|---|---|
| `text-xs` | 12 | Labels, chips, meta |
| `text-sm` | 14 | Body small, buttons |
| `text-base` | 16 | Body default |
| `text-lg` | 18 | Emphasized body |
| `text-xl` | 24 | Subheadings |
| `text-2xl` | 32 | Section titles |
| `text-3xl` | 48 | Large display |
| `text-4xl` | 72 | Hero numbers (timer on HUD) |
| `text-hero` | 96-120 | Cinematic only (grade letter, GAME OVER) |

### Letter-spacing
- Cinematic labels: `0.08em` (Bungee already tracked)
- Orbitron HUD: `0.04em`
- Orbitron uppercase small (eyebrows, chip labels): `0.2–0.3em`
- Body: `0` (default)

---

## Color

### Flame arc (primary palette)
Warm-to-cool progression with difficulty/intensity.

| Token | Hex | Usage |
|---|---|---|
| `--ember-core` | `#fff7ed` | Hot center of flame, S-rank accent |
| `--ember-amber` | `#f59e0b` | Primary accent, ember glow, idle flame |
| `--flame-red` | `#ef4444` | Easy-mode flame, warning accents |
| `--flame-purple` | `#7c3aed` | Hard-mode flame, boss/extreme indicator |
| `--flame-blue` | `#3b82f6` | Coldest flame tip, link/info accent |

### Gameplay
| Token | Hex | Usage |
|---|---|---|
| `--coin-gold` | `#fbbf24` | Coin counter, shop prices |
| `--life-red` | `#dc2626` | Hearts, life-lost flash |

### Semantic
| Token | Hex | Usage |
|---|---|---|
| `--success` | `#10b981` | Streak saved, session complete |
| `--warning` | `#f59e0b` | Low lives, imminent distraction |
| `--error` | `#dc2626` | Game over, API failure |
| `--info` | `#3b82f6` | AI analyzing, tooltips |

### Neutrals (shadcn zinc)
| Token | Hex | Usage |
|---|---|---|
| Background | `#0a0a0a` | Body bg (never `#000`, never `#fff`) |
| Surface 1 | `#18181b` | Modal bg, card bg (opaque) |
| Surface 2 | `#27272a` | Input bg, divider, inset |
| Border | `#3f3f46` | Card borders, input borders |
| Text dim | `#71717a` | Disabled text |
| Text muted | `#a1a1aa` | Secondary text |
| Text | `#fafafa` | Primary text |

### Gradient discipline (RISK #4)
**ALLOWED** gradients:
- Flame mesh (flame shape fill only): `amber → red → purple` at 135deg
- Grade reveal background: radial `amber 0% → red 40% → transparent 70%`
- Difficulty indicator: `purple → blue` vertical

**BANNED** gradients:
- ANY gradient on button surface (buttons are flat)
- Purple-on-text (illegible + AI-slop marker)
- Rainbow, holographic, pastel gradients
- Gradient borders on more than one element per screen

### Dark mode only
FocusLock does not ship a light mode. Ever. If the user asks, the answer is "no — this app is a focus room, not an office."

---

## Spacing

**Base unit:** 4px (matches Tailwind default).
**Density:** Comfortable. Card padding 24px. Section gap 48px.

### Scale
| Token | px | Use |
|---|---|---|
| `space-0` | 0 | — |
| `space-0.5` | 2 | Hairline inset |
| `space-1` | 4 | Icon-to-text |
| `space-2` | 8 | Tight gap |
| `space-3` | 12 | Default small gap |
| `space-4` | 16 | Default gap |
| `space-6` | 24 | Card padding |
| `space-8` | 32 | Section inner padding |
| `space-12` | 48 | Section gap |
| `space-16` | 64 | Hero padding |
| `space-24` | 96 | Page top/bottom |

---

## Layout

- **Approach:** Hybrid. Session Active = full-bleed fixed-inset HUD. Home/Summary = centered vertical stack. Stats/History = grid-disciplined.
- **Max content width:** 1280px (`max-w-7xl`)
- **Breakpoints:** sm 640 / md 768 / lg 1024 / xl 1280 (Tailwind defaults)
- **Grid:** 12-col desktop / 4-col mobile, 24px gutter

### Border radius
| Token | px | Use |
|---|---|---|
| `rounded-sm` | 8 | Chips, pills, small inputs |
| `rounded-md` | 12 | Inputs, small cards, alerts |
| `rounded-lg` | 16 | Buttons, medium cards |
| `rounded-2xl` | 24 | Glass cards (existing pattern) |
| `rounded-full` | 9999 | Stat chips, avatars, life hearts |

---

## Motion

### Duration scale (RISK #2)
| Token | ms | Use |
|---|---|---|
| `--tick` | 80 | Stat increment, number tick |
| `--beat` | 200 | UI state change, button hover, toast |
| `--swell` | 400 | Flame pulse, toast entrance, card reveal |
| `--cinematic` | 900 | Grade reveal, session start, milestone |
| `--burn` | 1800 | Game over, session end, major transition |

### Easing
| Use | Easing |
|---|---|
| Enter | `ease-out` |
| Exit | `ease-in` |
| Move | `ease-in-out` |
| Cinematic | `cubic-bezier(0.16, 1, 0.3, 1)` |

### Signature animations
- **Flame flicker:** continuous 400ms ease-in-out alternate, ±4% scale
- **Life lost shake:** 3 cycles × 80ms, 6px x-axis, `steps(3)`
- **Grade reveal:** 900ms cinematic, letter scales from 0.6 → 1 with text-shadow bloom
- **Coin earned:** 400ms swell, +coin slides up and fades
- **Distraction flash:** 200ms beat, red tint overlay at 20% opacity

---

## Decoration (RISK #5)

- **Film grain:** SVG noise at 4% opacity, `mix-blend-mode: overlay`, fixed to viewport. Always on.
- **Scan lines:** 1px horizontal at 2% opacity, 3px repeat. ONLY on HUD and "caught" screens, not on Home/Stats.
- **CRT flicker:** 300ms steps(1) infinite opacity [1, .88, .95, .85, .92, .98]. ONLY on GAME OVER, "caught" moments. Never ambient.
- **Ember rise particles:** Floating upward on `keyframes ember-rise`. Faint (opacity peaks at .22). Background layer only.
- **Ember glow (RISK #3):** Driven by CSS var `--ember-intensity` (0–1). Update live with focus streak. Glow radius and hue scale:
  - `0–0.3`: cold amber, 30px blur, low opacity
  - `0.3–0.7`: warm amber, 60px blur, normal opacity
  - `0.7–1.0`: hot white-core, 120px blur, high opacity

---

## Components

### Glass card
```css
.glass-card {
  @apply backdrop-blur-md bg-zinc-900/40 border border-zinc-800/50 rounded-2xl;
}
```
Subtle amber inner border for warm-themed cards: `box-shadow: inset 0 0 0 1px rgba(245,158,11,.08)`.

### Buttons
- **Primary:** flat `--ember-amber` bg, zinc-900 text, subtle border. NO gradient. Hover lifts 1px.
- **Secondary:** surface-2 bg, text primary, surface-3 border.
- **Ghost:** transparent bg, muted text, surface-3 border.
- **Danger:** `--life-red` bg, white text.

All buttons: `rounded-lg`, Orbitron 600, 13px, letter-spacing 0.15em, uppercase.

### Stat chip
Pill (`rounded-full`), zinc-900/75 with backdrop-blur, surface-3 border, Orbitron tabular-nums. Key label 9px uppercase tracked 0.25em muted. Value 16px 700 in accent color (amber/green/red depending on metric).

### Alert
`rounded-md`, 1px border in semantic color at 30% opacity, bg at 8% opacity, icon + text in semantic color at full saturation.

---

## Anti-patterns (what NOT to ship)

1. Gradient buttons (purple → pink, amber → orange). Flat only.
2. Centered-everything with uniform card spacing. Hierarchy demands asymmetry.
3. Uniform `rounded-xl` on every element. Use the radius scale.
4. Light mode. Don't even prototype it.
5. Generic "AI-powered" hero copy. Write like a coach yelling at you.
6. Emoji icons as primary UI (reserve for copy/roast moments).
7. Three-column feature grid with icons in colored circles. That's AI slop.
8. Inter or Poppins as display font. Orbitron/Bungee only for display.
9. Ambient scan-lines on every screen. Reserve for HUD/"caught"/GAME OVER.
10. Any purple on body text. Purple is flame/difficulty only.

---

## Implementation notes

### Tailwind tokens to add to `tailwind.config.ts`
```ts
extend: {
  fontFamily: {
    cinematic: ['Bungee', 'sans-serif'],
    display: ['Orbitron', 'sans-serif'],
    mono: ['Geist Mono', 'monospace'],
  },
  transitionDuration: {
    tick: '80ms',
    beat: '200ms',
    swell: '400ms',
    cinematic: '900ms',
    burn: '1800ms',
  },
  transitionTimingFunction: {
    cinematic: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
}
```

### Global CSS additions needed
1. Add `@import` for Bungee via Google Fonts (or `next/font` for Bungee).
2. Add `body::after` film-grain SVG overlay.
3. Add `--ember-intensity` CSS var (default 0.7, updated via JS from focus streak).
4. Extend `.ember-glow` to use `--ember-intensity` for dynamic scaling.
5. Add semantic color tokens (`--success`, `--warning`, `--info`) to `:root`.

### Existing `app/globals.css` keeps
- All existing flame color vars (`--ember-orange`, `--flame-red`, etc.)
- `.glass-card`, `.ember-glow`, `.text-game`, `.thin-scroll`
- `@keyframes crt-flicker`, `ember-rise`, `scan-line-move`, `ambient-breathe`, `blink`

### Migration order (if rebuilding incrementally)
1. Load Bungee font (non-breaking).
2. Add new CSS vars for motion + semantic colors.
3. Add film grain overlay (one line in `app/layout.tsx`).
4. Swap grade-reveal text to Bungee.
5. Gate scan-line + CRT flicker to specific screens (remove ambient use).
6. Audit all buttons — ensure zero gradients.

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-17 | Created DESIGN.md from `/design-consultation` | Formalized existing Dark Ember from CLAUDE.md + added evolution: Bungee cinematic font, motion scale, ember-intensity CSS var, gradient discipline, film grain. |
| 2026-04-17 | Chose Bungee over Monument Extended for cinematic | Bungee is free via Google Fonts, already broadcast-feel, zero license cost. Monument Extended requires paid license. Revisit if the hackathon demo needs a premium-feel upgrade. |
| 2026-04-17 | Kept Orbitron (existing) | Project already built around it. Changing now would churn all stat/timer components. Revisit if brand direction pivots. |
| 2026-04-17 | Banned light mode | Product is a focus room. Light mode undermines the cockpit metaphor. |
