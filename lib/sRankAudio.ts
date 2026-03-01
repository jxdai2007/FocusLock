// ---------------------------------------------------------------------------
// S-Rank Meteor Impact — Web Audio API synthesized sounds
// No external audio files. All sounds are procedurally generated.
// ---------------------------------------------------------------------------

/**
 * Low rumble that plays during the meteor phase.
 * Returns a stop function to kill the oscillator.
 */
export function playSRankRumble(ctx: AudioContext): () => void {
  try {
    const now = ctx.currentTime

    // Main low drone — 60 Hz sine
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 60

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.15, now + 0.8)

    // Tremolo — ~4 Hz modulator on the gain
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 4
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.03

    lfo.connect(lfoGain)
    lfoGain.connect(gain.gain)
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    lfo.start(now)

    return () => {
      try {
        osc.stop()
        lfo.stop()
      } catch {
        // already stopped
      }
    }
  } catch {
    return () => {}
  }
}

/**
 * Impact sound — three simultaneous layers:
 * 1. White noise burst (0.05s)
 * 2. Low thud (80 Hz, 0.2s)
 * 3. High crack (2000 Hz, 0.03s)
 */
export function playSRankImpact(ctx: AudioContext): void {
  try {
    const now = ctx.currentTime

    // Layer 1: White noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.05)
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.3, now)
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.05)
    noise.connect(noiseGain)
    noiseGain.connect(ctx.destination)
    noise.start(now)

    // Layer 2: Low thud — 80 Hz sine
    const thud = ctx.createOscillator()
    thud.type = 'sine'
    thud.frequency.value = 80
    const thudGain = ctx.createGain()
    thudGain.gain.setValueAtTime(0.25, now)
    thudGain.gain.linearRampToValueAtTime(0, now + 0.2)
    thud.connect(thudGain)
    thudGain.connect(ctx.destination)
    thud.start(now)
    thud.stop(now + 0.2)

    // Layer 3: High crack — 2000 Hz sine
    const crack = ctx.createOscillator()
    crack.type = 'sine'
    crack.frequency.value = 2000
    const crackGain = ctx.createGain()
    crackGain.gain.setValueAtTime(0.15, now)
    crackGain.gain.linearRampToValueAtTime(0, now + 0.03)
    crack.connect(crackGain)
    crackGain.connect(ctx.destination)
    crack.start(now)
    crack.stop(now + 0.03)
  } catch {
    // Audio not available
  }
}

/**
 * Minecraft-style "block breaking" bass hit.
 * Low-pass-filtered white noise burst layered on the existing impact.
 */
export function playSRankBlockBreak(ctx: AudioContext): void {
  try {
    const now = ctx.currentTime

    const bufferSize = Math.floor(ctx.sampleRate * 0.15)
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer

    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 200

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.linearRampToValueAtTime(0, now + 0.15)

    noise.connect(lowpass)
    lowpass.connect(gain)
    gain.connect(ctx.destination)
    noise.start(now)
  } catch {
    // Audio not available
  }
}

/**
 * Rising sine sweep as the S letter emerges through cracks.
 * 200 Hz → 600 Hz over 0.3s, gain 0.1 → 0.
 */
export function playSRankEmerge(ctx: AudioContext): void {
  try {
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(200, now)
    osc.frequency.linearRampToValueAtTime(600, now + 0.3)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.1, now)
    gain.gain.linearRampToValueAtTime(0, now + 0.3)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.3)
  } catch {
    // Audio not available
  }
}
