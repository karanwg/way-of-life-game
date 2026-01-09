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

  // Render dice face with dots (d4 style - pyramid)
  const renderDiceFace = (num: number) => {
    const dotPositions: Record<number, string[]> = {
      1: ["50% 50%"],
      2: ["30% 35%", "70% 65%"],
      3: ["50% 25%", "25% 70%", "75% 70%"],
      4: ["30% 30%", "70% 30%", "30% 70%", "70% 70%"],
    }

    return (
      <div className="relative w-full h-full">
        {dotPositions[num]?.map((pos, i) => {
          const [x, y] = pos.split(" ")
          return (
            <div
              key={i}
              className="absolute w-3 h-3 bg-white rounded-full shadow-lg"
              style={{
                left: x,
                top: y,
                transform: "translate(-50%, -50%)",
              }}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`
          relative w-16 h-16 rounded-xl
          bg-gradient-to-br from-purple-500 via-pink-500 to-red-500
          shadow-[0_0_30px_rgba(168,85,247,0.5)]
          flex items-center justify-center
          ${isRolling ? "animate-dice-roll" : showResult ? "animate-bounce-in" : ""}
        `}
        style={{
          perspective: "500px",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Inner dice face */}
        <div className="absolute inset-1 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
          {renderDiceFace(displayValue)}
        </div>

        {/* Sparkle effects on result */}
        {showResult && (
          <>
            <div
              className="absolute -top-2 -left-2 w-4 h-4 text-yellow-400 animate-sparkle"
              style={{ animationDelay: "0ms" }}
            >
              *
            </div>
            <div
              className="absolute -top-1 -right-2 w-4 h-4 text-yellow-400 animate-sparkle"
              style={{ animationDelay: "100ms" }}
            >
              *
            </div>
            <div
              className="absolute -bottom-2 left-1/2 w-4 h-4 text-yellow-400 animate-sparkle"
              style={{ animationDelay: "200ms" }}
            >
              *
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
