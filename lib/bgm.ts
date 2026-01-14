// Procedural Background Music Generator
// Creates a chill, island-style ambient soundtrack

let audioContext: AudioContext | null = null
let isPlaying = false
let masterGain: GainNode | null = null
let schedulerInterval: NodeJS.Timeout | null = null

// Pentatonic scale for island/chill vibe (C major pentatonic)
const SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25] // C, D, E, G, A, C, D, E
const BASS_NOTES = [130.81, 146.83, 164.81, 196.00] // C, D, E, G (lower octave)
const CHORD_PROGRESSIONS = [
  [0, 2, 4], // C major-ish
  [3, 5, 7], // G major-ish  
  [1, 3, 5], // D minor-ish
  [4, 6, 1], // A minor-ish
]

let currentChordIndex = 0
let beatCount = 0

function createAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext()
    masterGain = audioContext.createGain()
    masterGain.gain.value = 0.3
    masterGain.connect(audioContext.destination)
  }
  return audioContext
}

// Soft pad sound (warm, ambient)
function playPad(frequency: number, duration: number, startTime: number) {
  if (!audioContext || !masterGain) return

  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const filter = audioContext.createBiquadFilter()

  osc.type = "sine"
  osc.frequency.value = frequency

  filter.type = "lowpass"
  filter.frequency.value = 800
  filter.Q.value = 1

  // Soft attack and release
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.08, startTime + 0.3)
  gain.gain.setValueAtTime(0.08, startTime + duration - 0.5)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

// Soft pluck sound (guitar-like)
function playPluck(frequency: number, startTime: number) {
  if (!audioContext || !masterGain) return

  const osc = audioContext.createOscillator()
  const osc2 = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const filter = audioContext.createBiquadFilter()

  osc.type = "triangle"
  osc.frequency.value = frequency
  osc2.type = "sine"
  osc2.frequency.value = frequency * 2

  filter.type = "lowpass"
  filter.frequency.setValueAtTime(2000, startTime)
  filter.frequency.exponentialRampToValueAtTime(400, startTime + 0.5)

  // Quick attack, slow decay (guitar-like)
  gain.gain.setValueAtTime(0.15, startTime)
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + 1.2)

  osc.connect(filter)
  osc2.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain)

  osc.start(startTime)
  osc.stop(startTime + 1.5)
  osc2.start(startTime)
  osc2.stop(startTime + 1.5)
}

// Soft percussion (shaker-like)
function playShaker(startTime: number, loud: boolean = false) {
  if (!audioContext || !masterGain) return

  const bufferSize = audioContext.sampleRate * 0.1
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3))
  }

  const source = audioContext.createBufferSource()
  const gain = audioContext.createGain()
  const filter = audioContext.createBiquadFilter()

  source.buffer = buffer
  filter.type = "highpass"
  filter.frequency.value = 5000

  gain.gain.value = loud ? 0.08 : 0.04

  source.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain)

  source.start(startTime)
}

// Soft kick (like a gentle bongo)
function playBongo(startTime: number) {
  if (!audioContext || !masterGain) return

  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()

  osc.type = "sine"
  osc.frequency.setValueAtTime(150, startTime)
  osc.frequency.exponentialRampToValueAtTime(50, startTime + 0.1)

  gain.gain.setValueAtTime(0.2, startTime)
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)

  osc.connect(gain)
  gain.connect(masterGain)

  osc.start(startTime)
  osc.stop(startTime + 0.4)
}

// Schedule music loop
function scheduleMusic() {
  if (!audioContext || !isPlaying) return

  const now = audioContext.currentTime
  const beatDuration = 0.5 // 120 BPM feel but half-time = chill

  // Every 8 beats, change chord
  if (beatCount % 8 === 0) {
    currentChordIndex = (currentChordIndex + 1) % CHORD_PROGRESSIONS.length
    const chord = CHORD_PROGRESSIONS[currentChordIndex]
    
    // Play pad chord
    chord.forEach((noteIndex, i) => {
      playPad(SCALE[noteIndex] * 0.5, beatDuration * 8, now + i * 0.05)
    })

    // Bass note
    playPluck(BASS_NOTES[currentChordIndex], now)
  }

  // Gentle percussion pattern
  if (beatCount % 4 === 0) {
    playBongo(now)
  }
  if (beatCount % 2 === 0) {
    playShaker(now, beatCount % 4 === 0)
  }
  if (beatCount % 2 === 1) {
    playShaker(now + 0.25, false)
  }

  // Occasional melody pluck
  if (beatCount % 4 === 2 && Math.random() > 0.3) {
    const chord = CHORD_PROGRESSIONS[currentChordIndex]
    const noteIndex = chord[Math.floor(Math.random() * chord.length)]
    playPluck(SCALE[noteIndex], now)
  }

  beatCount++
}

export function startBGM() {
  if (isPlaying) return

  createAudioContext()
  if (audioContext?.state === "suspended") {
    audioContext.resume()
  }

  isPlaying = true
  beatCount = 0
  currentChordIndex = 0

  // Schedule beats
  schedulerInterval = setInterval(scheduleMusic, 500)
  scheduleMusic() // Start immediately
}

export function stopBGM() {
  isPlaying = false
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
}

export function toggleBGM(): boolean {
  if (isPlaying) {
    stopBGM()
    return false
  } else {
    startBGM()
    return true
  }
}

export function isBGMPlaying(): boolean {
  return isPlaying
}

export function setBGMVolume(volume: number) {
  if (masterGain) {
    masterGain.gain.value = Math.max(0, Math.min(1, volume)) * 0.3
  }
}
