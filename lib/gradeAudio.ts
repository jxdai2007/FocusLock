/**
 * Web Audio procedural sounds for grade reveal animations.
 * Pattern follows sRankAudio.ts: pure functions, AudioContext param, try/catch.
 */

/** A-rank: classic two-tone level-up chime */
export function playLevelUpDing(ctx: AudioContext): void {
  try {
    const now = ctx.currentTime

    // Tone 1: 880Hz sine, 0.15s
    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.value = 880
    const g1 = ctx.createGain()
    g1.gain.setValueAtTime(0.2, now)
    g1.gain.linearRampToValueAtTime(0, now + 0.15)
    osc1.connect(g1)
    g1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.15)

    // Tone 2: 1320Hz sine, 0.1s, delayed 0.1s
    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = 1320
    const g2 = ctx.createGain()
    g2.gain.setValueAtTime(0.15, now + 0.1)
    g2.gain.linearRampToValueAtTime(0, now + 0.2)
    osc2.connect(g2)
    g2.connect(ctx.destination)
    osc2.start(now + 0.1)
    osc2.stop(now + 0.2)
  } catch {
    // Audio not available
  }
}

/** B-rank: metallic clank with scaling intensity (1-3) */
export function playForgeClank(ctx: AudioContext, intensity: 1 | 2 | 3): void {
  try {
    const now = ctx.currentTime
    const vol = [0.15, 0.25, 0.35][intensity - 1]
    const pitchMult = [1.0, 1.1, 1.2][intensity - 1]
    const noiseDur = [0.03, 0.04, 0.05][intensity - 1]

    // Layer 1: Square wave metallic hit
    const hit = ctx.createOscillator()
    hit.type = 'square'
    hit.frequency.value = 200 * pitchMult
    const hitGain = ctx.createGain()
    hitGain.gain.setValueAtTime(vol, now)
    hitGain.gain.linearRampToValueAtTime(0, now + 0.08)
    hit.connect(hitGain)
    hitGain.connect(ctx.destination)
    hit.start(now)
    hit.stop(now + 0.08)

    // Layer 2: Sine metallic ring
    const ring = ctx.createOscillator()
    ring.type = 'sine'
    ring.frequency.value = 800 * pitchMult
    const ringGain = ctx.createGain()
    ringGain.gain.setValueAtTime(vol * 0.6, now)
    ringGain.gain.linearRampToValueAtTime(0, now + 0.15)
    ring.connect(ringGain)
    ringGain.connect(ctx.destination)
    ring.start(now)
    ring.stop(now + 0.15)

    // Layer 3: White noise impact
    const bufferSize = Math.floor(ctx.sampleRate * noiseDur)
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(vol * 0.8, now)
    noiseGain.gain.linearRampToValueAtTime(0, now + noiseDur)
    noise.connect(noiseGain)
    noiseGain.connect(ctx.destination)
    noise.start(now)
  } catch {
    // Audio not available
  }
}

/** C-rank: digital corruption static with intermittent beeps */
export function playErrorStatic(ctx: AudioContext): void {
  try {
    const now = ctx.currentTime

    // White noise 0.8s, ramps up then down
    const bufferSize = Math.floor(ctx.sampleRate * 0.8)
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0, now)
    noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.4)
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.8)
    noise.connect(noiseGain)
    noiseGain.connect(ctx.destination)
    noise.start(now)

    // Three intermittent 440Hz square beeps
    const beepTimes = [0, 0.25, 0.55]
    for (const offset of beepTimes) {
      const beep = ctx.createOscillator()
      beep.type = 'square'
      beep.frequency.value = 440
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.1, now + offset)
      g.gain.linearRampToValueAtTime(0, now + offset + 0.05)
      beep.connect(g)
      g.connect(ctx.destination)
      beep.start(now + offset)
      beep.stop(now + offset + 0.05)
    }
  } catch {
    // Audio not available
  }
}

/** C-rank: terminal error double-beep */
export function playErrorBeep(ctx: AudioContext): void {
  try {
    const now = ctx.currentTime

    const times = [0, 0.15]
    for (const offset of times) {
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = 220
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.12, now + offset)
      g.gain.linearRampToValueAtTime(0, now + offset + 0.08)
      osc.connect(g)
      g.connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.08)
    }
  } catch {
    // Audio not available
  }
}
