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
      console.log("Audio not available")
    }
  }

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    // 5 second countdown: Ready (1.5s) -> Set (2.8s) -> Go (4s) -> Complete (5s)
    timers.push(setTimeout(() => { setCurrentLight("red"); playBeep(440, 0.3) }, 1500))
    timers.push(setTimeout(() => { setCurrentLight("yellow"); playBeep(440, 0.3) }, 2800))
    timers.push(setTimeout(() => { setCurrentLight("green"); setShowGo(true); playBeep(880, 0.6, "long") }, 4000))
    timers.push(setTimeout(() => { setIsExiting(true) }, 4700))
    timers.push(setTimeout(() => { onComplete() }, 5000))

    return () => {
      timers.forEach(clearTimeout)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [onComplete])

  return (
    <div
      className={`
        w-full max-w-xl mx-4
        bg-[#FAF8F0] rounded-2xl border-4 border-amber-700/80 shadow-2xl overflow-hidden
        transition-opacity duration-300
        ${isExiting ? "opacity-0" : "opacity-100"}
      `}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-center">
        <div className="text-4xl mb-1">🎲</div>
        <h1 className="text-2xl font-black text-white">Way of Life</h1>
      </div>

      <div className="p-6">
        {/* Traffic Light */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="bg-gray-800 rounded-2xl p-4 shadow-lg">
            <div className="flex gap-3">
              <div
                className={`
                  w-12 h-12 rounded-full transition-all duration-200 border-2 border-gray-700
                  ${currentLight === "red"
                    ? "bg-red-500 shadow-[0_0_20px_5px_rgba(239,68,68,0.5)]"
                    : "bg-red-900/40"
                  }
                `}
              />
              <div
                className={`
                  w-12 h-12 rounded-full transition-all duration-200 border-2 border-gray-700
                  ${currentLight === "yellow"
                    ? "bg-yellow-400 shadow-[0_0_20px_5px_rgba(250,204,21,0.5)]"
                    : "bg-yellow-900/40"
                  }
                `}
              />
              <div
                className={`
                  w-12 h-12 rounded-full transition-all duration-200 border-2 border-gray-700
                  ${currentLight === "green"
                    ? "bg-green-500 shadow-[0_0_20px_5px_rgba(34,197,94,0.5)]"
                    : "bg-green-900/40"
                  }
                `}
              />
            </div>
          </div>

          <div className="min-w-[100px]">
            {currentLight === "off" && (
              <p className="text-lg text-amber-700 font-semibold animate-pulse">Get Ready...</p>
            )}
            {currentLight === "red" && (
              <p className="text-2xl text-red-600 font-black">READY</p>
            )}
            {currentLight === "yellow" && (
              <p className="text-2xl text-amber-600 font-black">SET</p>
            )}
            {showGo && (
              <p className="text-3xl text-green-600 font-black">GO! 🚀</p>
            )}
          </div>
        </div>

        {/* Quick rules */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white rounded-xl p-3 border-2 border-amber-100">
            <p className="text-gray-800 font-bold mb-1">🎯 Goal</p>
            <p className="text-gray-600 text-xs">Answer questions, collect coins!</p>
          </div>
          <div className="bg-white rounded-xl p-3 border-2 border-amber-100">
            <p className="text-gray-800 font-bold mb-1">✅ Correct</p>
            <p className="text-gray-600 text-xs">+100 coins, roll dice, move!</p>
          </div>
          <div className="bg-white rounded-xl p-3 border-2 border-amber-100">
            <p className="text-gray-800 font-bold mb-1">❌ Wrong</p>
            <p className="text-gray-600 text-xs">-50 coins, no movement</p>
          </div>
          <div className="bg-white rounded-xl p-3 border-2 border-amber-100">
            <p className="text-gray-800 font-bold mb-1">🏠 Lap Bonus</p>
            <p className="text-gray-600 text-xs">Pass GO = +200 coins!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
