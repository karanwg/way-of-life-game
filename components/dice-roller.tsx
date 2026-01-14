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
      // Animate through random values (d6)
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1)
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

  // Render dice face with dots (d6 style)
  const renderDiceFace = (num: number) => {
    const dotSize = "w-3 h-3"
    const dotClass = `${dotSize} bg-gray-800 rounded-full shadow-md`
    
    const dotLayouts: Record<number, React.ReactNode> = {
      1: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-4 h-4 bg-gray-800 rounded-full shadow-lg`} />
        </div>
      ),
      2: (
        <div className="absolute inset-0 flex flex-col justify-between p-2.5">
          <div className="flex justify-start">
            <div className={dotClass} />
          </div>
          <div className="flex justify-end">
            <div className={dotClass} />
          </div>
        </div>
      ),
      3: (
        <div className="absolute inset-0 flex flex-col justify-between p-2.5">
          <div className="flex justify-start">
            <div className={dotClass} />
          </div>
          <div className="flex justify-center">
            <div className={dotClass} />
          </div>
          <div className="flex justify-end">
            <div className={dotClass} />
          </div>
        </div>
      ),
      4: (
        <div className="absolute inset-0 flex flex-col justify-between p-2.5">
          <div className="flex justify-between">
            <div className={dotClass} />
            <div className={dotClass} />
          </div>
          <div className="flex justify-between">
            <div className={dotClass} />
            <div className={dotClass} />
          </div>
        </div>
      ),
      5: (
        <div className="absolute inset-0 flex flex-col justify-between p-2.5">
          <div className="flex justify-between">
            <div className={dotClass} />
            <div className={dotClass} />
          </div>
          <div className="flex justify-center">
            <div className={dotClass} />
          </div>
          <div className="flex justify-between">
            <div className={dotClass} />
            <div className={dotClass} />
          </div>
        </div>
      ),
      6: (
        <div className="absolute inset-0 flex flex-col justify-between p-2.5">
          <div className="flex justify-between">
            <div className={dotClass} />
            <div className={dotClass} />
          </div>
          <div className="flex justify-between">
            <div className={dotClass} />
            <div className={dotClass} />
          </div>
          <div className="flex justify-between">
            <div className={dotClass} />
            <div className={dotClass} />
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
          relative w-20 h-20 rounded-xl
          bg-white border-4 border-red-500
          shadow-playful
          ${isRolling ? "animate-dice-roll" : ""}
        `}
        style={isRolling ? {
          perspective: "500px",
          transformStyle: "preserve-3d",
        } : undefined}
      >
        {/* Inner dice face */}
        <div className="relative w-full h-full bg-white rounded-lg">
          {renderDiceFace(displayValue)}
        </div>

        {/* Sparkle effects on result */}
        {showResult && (
          <>
            <div
              className="absolute -top-2 -left-2 w-4 h-4 text-amber-400 animate-sparkle"
              style={{ animationDelay: "0ms" }}
            >
              ✦
            </div>
            <div
              className="absolute -top-1 -right-2 w-4 h-4 text-amber-400 animate-sparkle"
              style={{ animationDelay: "100ms" }}
            >
              ✦
            </div>
            <div
              className="absolute -bottom-2 left-1/2 w-4 h-4 text-amber-400 animate-sparkle"
              style={{ animationDelay: "200ms" }}
            >
              ✦
            </div>
          </>
        )}
      </div>

      {/* Roll result text */}
      {showResult && value !== null && (
        <div className="text-xl font-black text-emerald-600 animate-bounce-in">Rolled {value}!</div>
      )}
    </div>
  )
}
