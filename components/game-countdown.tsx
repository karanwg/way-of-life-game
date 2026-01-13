"use client"

import { useEffect, useState, useRef } from "react"

interface GameCountdownProps {
  onComplete: () => void
}

type LightState = "off" | "red" | "yellow" | "green"

export function GameCountdown({ onComplete }: GameCountdownProps) {
  const [currentLight, setCurrentLight] = useState<LightState>("off")
  const [showGo, setShowGo] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Create beep sounds using Web Audio API
  const playBeep = (frequency: number, duration: number, type: "short" | "long" = "short") => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = frequency
      oscillator.type = "sine"

      // Envelope for the sound
      const now = ctx.currentTime
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02)
      
      if (type === "long") {
        gainNode.gain.setValueAtTime(0.3, now + duration - 0.1)
        gainNode.gain.linearRampToValueAtTime(0, now + duration)
      } else {
        gainNode.gain.linearRampToValueAtTime(0, now + duration)
      }

      oscillator.start(now)
      oscillator.stop(now + duration)
    } catch (e) {
      // Audio not supported, continue silently
      console.log("Audio not available")
    }
  }

  useEffect(() => {
    // Extended 10-second sequence:
    // 0ms - Show overlay with instructions
    // 4000ms - RED light + beep
    // 6500ms - YELLOW light + beep  
    // 8500ms - GREEN light + GO! + long beep
    // 10000ms - Exit

    const timers: NodeJS.Timeout[] = []

    timers.push(setTimeout(() => {
      setCurrentLight("red")
      playBeep(440, 0.3) // A4 note
    }, 4000))

    timers.push(setTimeout(() => {
      setCurrentLight("yellow")
      playBeep(440, 0.3)
    }, 6500))

    timers.push(setTimeout(() => {
      setCurrentLight("green")
      setShowGo(true)
      playBeep(880, 0.6, "long") // A5 note, longer
    }, 8500))

    timers.push(setTimeout(() => {
      setIsExiting(true)
    }, 9700))

    timers.push(setTimeout(() => {
      onComplete()
    }, 10000))

    return () => {
      timers.forEach(clearTimeout)
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [onComplete])

  return (
    <div
      className={`
        h-full w-full flex flex-col items-center justify-center gap-4
        transition-opacity duration-300
        ${isExiting ? "opacity-0" : "opacity-100"}
      `}
    >
      {/* Top row: Traffic Light + Status */}
      <div className="flex items-center gap-6">
        {/* Traffic Light */}
        <div className="bg-gray-800 rounded-xl p-3 shadow-xl border-2 border-gray-700">
          <div className="flex gap-3">
            {/* Red Light */}
            <div
              className={`
                w-12 h-12 rounded-full border-2 transition-all duration-200
                ${currentLight === "red"
                  ? "bg-red-500 border-red-400 shadow-[0_0_25px_6px_rgba(239,68,68,0.5)]"
                  : "bg-red-950 border-red-900"
                }
              `}
            />

            {/* Yellow Light */}
            <div
              className={`
                w-12 h-12 rounded-full border-2 transition-all duration-200
                ${currentLight === "yellow"
                  ? "bg-yellow-400 border-yellow-300 shadow-[0_0_25px_6px_rgba(250,204,21,0.5)]"
                  : "bg-yellow-950 border-yellow-900"
                }
              `}
            />

            {/* Green Light */}
            <div
              className={`
                w-12 h-12 rounded-full border-2 transition-all duration-200
                ${currentLight === "green"
                  ? "bg-green-500 border-green-400 shadow-[0_0_25px_6px_rgba(34,197,94,0.5)]"
                  : "bg-green-950 border-green-900"
                }
              `}
            />
          </div>
        </div>

        {/* Status Text */}
        <div className="min-w-[140px]">
          {currentLight === "off" && (
            <p className="text-xl text-white font-bold animate-pulse">Get Ready...</p>
          )}
          {currentLight === "red" && (
            <p className="text-3xl text-red-400 font-black animate-bounce-in">READY</p>
          )}
          {currentLight === "yellow" && (
            <p className="text-3xl text-yellow-400 font-black animate-bounce-in">SET</p>
          )}
          {showGo && (
            <p className="text-4xl text-green-400 font-black animate-bounce-in drop-shadow-[0_0_15px_rgba(34,197,94,0.7)]">
              GO! 🚀
            </p>
          )}
        </div>
      </div>

      {/* Instructions Grid */}
      <div className="flex gap-4 text-sm max-w-3xl">
        <div className="flex-1 bg-black/20 rounded-lg p-3 border border-purple-500/20">
          <p className="text-purple-300 font-semibold mb-1">🎯 Goal</p>
          <p className="text-gray-300">Answer quiz questions to earn coins. Most coins at the end wins!</p>
        </div>
        
        <div className="flex-1 bg-black/20 rounded-lg p-3 border border-purple-500/20">
          <p className="text-green-300 font-semibold mb-1">✅ Correct Answer</p>
          <p className="text-gray-300">+100 coins, roll d4 dice, move on board, trigger tile effects</p>
        </div>
        
        <div className="flex-1 bg-black/20 rounded-lg p-3 border border-purple-500/20">
          <p className="text-red-300 font-semibold mb-1">❌ Wrong Answer</p>
          <p className="text-gray-300">-50 coins, no movement. Watch out for debt!</p>
        </div>
        
        <div className="flex-1 bg-black/20 rounded-lg p-3 border border-purple-500/20">
          <p className="text-yellow-300 font-semibold mb-1">🏠 Lap Bonus</p>
          <p className="text-gray-300">Pass Home tile = +300 coins. Land on Home = +100 bonus!</p>
        </div>
      </div>
    </div>
  )
}
