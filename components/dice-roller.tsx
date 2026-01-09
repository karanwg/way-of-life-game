"use client"

import { useState, useEffect } from "react"

interface DiceRollerProps {
  value: number | null
  isRolling: boolean
  onRollComplete?: () => void
}

export function DiceRoller({ value, isRolling, onRollComplete }: DiceRollerProps) {
  const [displayValue, setDisplayValue] = useState<number>(1)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (isRolling) {
      setShowResult(false)
      // Animate through random values
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 4) + 1)
      }, 80)

      // Stop after animation
      const timeout = setTimeout(() => {
        clearInterval(interval)
        if (value !== null) {
          setDisplayValue(value)
          setShowResult(true)
          onRollComplete?.()
        }
      }, 600)

      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    } else if (value !== null) {
      setDisplayValue(value)
      setShowResult(true)
    }
  }, [isRolling, value, onRollComplete])

  // Render dice face with dots (d4 style)
  const renderDiceFace = (num: number) => {
    // Container is 56x56px (64 - 8px padding), we use a grid approach
    const dotLayouts: Record<number, React.ReactNode> = {
      1: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
        </div>
      ),
      2: (
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          <div className="flex justify-start">
            <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
          </div>
          <div className="flex justify-end">
            <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
          </div>
        </div>
      ),
      3: (
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          <div className="flex justify-center">
            <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
          </div>
          <div className="flex justify-between">
            <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
            <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
          </div>
        </div>
      ),
      4: (
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          <div className="flex justify-between">
            <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
            <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
          </div>
          <div className="flex justify-between">
            <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
            <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
          </div>
        </div>
      ),
    }

    return dotLayouts[num] || null
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`
          relative w-16 h-16 rounded-xl p-1
          bg-gradient-to-br from-purple-500 via-pink-500 to-red-500
          shadow-[0_0_30px_rgba(168,85,247,0.5)]
          ${isRolling ? "animate-dice-roll" : ""}
        `}
        style={isRolling ? {
          perspective: "500px",
          transformStyle: "preserve-3d",
        } : undefined}
      >
        {/* Inner dice face */}
        <div className="relative w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg">
          {renderDiceFace(displayValue)}
        </div>

        {/* Sparkle effects on result */}
        {showResult && (
          <>
            <div
              className="absolute -top-2 -left-2 w-4 h-4 text-yellow-400 animate-sparkle"
              style={{ animationDelay: "0ms" }}
            >
              ✦
            </div>
            <div
              className="absolute -top-1 -right-2 w-4 h-4 text-yellow-400 animate-sparkle"
              style={{ animationDelay: "100ms" }}
            >
              ✦
            </div>
            <div
              className="absolute -bottom-2 left-1/2 w-4 h-4 text-yellow-400 animate-sparkle"
              style={{ animationDelay: "200ms" }}
            >
              ✦
            </div>
          </>
        )}
      </div>

      {/* Roll result text */}
      {showResult && value !== null && (
        <div className="text-lg font-bold text-accent animate-bounce-in">Rolled {value}!</div>
      )}
    </div>
  )
}
