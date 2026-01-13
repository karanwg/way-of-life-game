// Sound effects using Web Audio API - no external files needed

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext) {
      audioContext = new AudioContext()
    }
    return audioContext
  } catch {
    return null
  }
}

/**
 * Play a "cha-ching" coin sound for gaining money
 * Bright, metallic ascending tones
 */
export function playChaChingSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  // First "cha" - higher metallic ping
  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.frequency.value = 1200
  osc1.type = "sine"
  gain1.gain.setValueAtTime(0, now)
  gain1.gain.linearRampToValueAtTime(0.3, now + 0.01)
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
  osc1.start(now)
  osc1.stop(now + 0.15)

  // Second "ching" - even higher, brighter
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.frequency.value = 1800
  osc2.type = "sine"
  gain2.gain.setValueAtTime(0, now + 0.08)
  gain2.gain.linearRampToValueAtTime(0.35, now + 0.09)
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35)
  osc2.start(now + 0.08)
  osc2.stop(now + 0.35)

  // Add a subtle shimmer/sparkle
  const osc3 = ctx.createOscillator()
  const gain3 = ctx.createGain()
  osc3.connect(gain3)
  gain3.connect(ctx.destination)
  osc3.frequency.value = 2400
  osc3.type = "sine"
  gain3.gain.setValueAtTime(0, now + 0.1)
  gain3.gain.linearRampToValueAtTime(0.15, now + 0.12)
  gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
  osc3.start(now + 0.1)
  osc3.stop(now + 0.4)
}

/**
 * Play a sad descending "wah wah wah" sound for losing money
 * Three descending tones
 */
export function playLoseMoneySound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const notes = [350, 300, 250] // Descending frequencies
  const noteDuration = 0.25
  const noteGap = 0.28

  notes.forEach((freq, i) => {
    const startTime = now + i * noteGap
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    // Start at frequency and slide down slightly for sad effect
    osc.frequency.setValueAtTime(freq, startTime)
    osc.frequency.linearRampToValueAtTime(freq * 0.9, startTime + noteDuration)
    osc.type = "sine"
    
    // Volume envelope
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02)
    gain.gain.setValueAtTime(0.25, startTime + noteDuration * 0.6)
    gain.gain.linearRampToValueAtTime(0, startTime + noteDuration)
    
    osc.start(startTime)
    osc.stop(startTime + noteDuration)
  })
}

/**
 * Play a quick positive blip for small gains
 */
export function playPositiveBlip() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  osc.connect(gain)
  gain.connect(ctx.destination)
  
  osc.frequency.setValueAtTime(800, now)
  osc.frequency.linearRampToValueAtTime(1200, now + 0.1)
  osc.type = "sine"
  
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.2, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
  
  osc.start(now)
  osc.stop(now + 0.15)
}

/**
 * Play a quick negative blip for small losses
 */
export function playNegativeBlip() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  osc.connect(gain)
  gain.connect(ctx.destination)
  
  osc.frequency.setValueAtTime(400, now)
  osc.frequency.linearRampToValueAtTime(250, now + 0.15)
  osc.type = "sine"
  
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.2, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
  
  osc.start(now)
  osc.stop(now + 0.2)
}
