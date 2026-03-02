/**
 * Evidence slam thud — procedural Web Audio.
 * Layer 1: Low sine thud (configurable frequency)
 * Layer 2: White noise burst (paper/photo slap)
 */
export function playEvidenceSlam(ctx: AudioContext, freq = 80): void {
  try {
    const now = ctx.currentTime

    const thud = ctx.createOscillator()
    thud.type = 'sine'
    thud.frequency.value = freq
    const thudGain = ctx.createGain()
    thudGain.gain.setValueAtTime(0.3, now)
    thudGain.gain.linearRampToValueAtTime(0, now + 0.15)
    thud.connect(thudGain)
    thudGain.connect(ctx.destination)
    thud.start(now)
    thud.stop(now + 0.15)

    const bufferSize = Math.floor(ctx.sampleRate * 0.04)
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.25, now)
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.04)
    noise.connect(noiseGain)
    noiseGain.connect(ctx.destination)
    noise.start(now)
  } catch {
    // Audio not available
  }
}
