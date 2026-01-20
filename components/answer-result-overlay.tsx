/**
 * AnswerResultOverlay - Dramatic full-screen animation for quiz answers
 * 
 * Shows a celebratory animation for correct answers (+300 coins)
 * or a subdued animation for wrong answers (+0 coins)
 */

"use client"

import { useEffect, useState } from "react"
import { playChaChingSound } from "@/lib/sounds"

interface AnswerResultOverlayProps {
  isCorrect: boolean
  coins: number // Coins gained (300 for correct, 0 for wrong)
  onComplete: () => void
}

export function AnswerResultOverlay({ isCorrect, coins, onComplete }: AnswerResultOverlayProps) {
  const [phase, setPhase] = useState<"entering" | "showing" | "exiting">("entering")
  const [showCoins, setShowCoins] = useState(false)
  const [coinCount, setCoinCount] = useState(0)

  useEffect(() => {
    // Play sound for correct answers
    if (isCorrect) {
      playChaChingSound()
    }

    // Phase 1: Enter animation
    const enterTimer = setTimeout(() => {
      setPhase("showing")
      setShowCoins(true)
      
      // Animate coin counter for correct answers
      if (isCorrect && coins > 0) {
        let count = 0
        const increment = Math.ceil(coins / 15)
        const counterInterval = setInterval(() => {
          count += increment
          if (count >= coins) {
            setCoinCount(coins)
            clearInterval(counterInterval)
          } else {
            setCoinCount(count)
          }
        }, 50)
      }
    }, 350)

    // Phase 2: Show for a moment
    const showTimer = setTimeout(() => {
      setPhase("exiting")
    }, 1700)

    // Phase 3: Exit and callback
    const exitTimer = setTimeout(() => {
      onComplete()
    }, 2200)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(showTimer)
      clearTimeout(exitTimer)
    }
  }, [isCorrect, coins, onComplete])

  return (
    <div 
      className={`
        fixed inset-0 z-[60] flex items-center justify-center
        transition-all duration-500
        ${phase === "entering" ? "opacity-0" : "opacity-100"}
        ${phase === "exiting" ? "opacity-0 scale-110" : ""}
      `}
    >
      {/* Background */}
      <div 
        className={`
          absolute inset-0 transition-all duration-500
          ${isCorrect 
            ? "bg-gradient-to-br from-green-900/90 via-emerald-800/90 to-green-900/90" 
            : "bg-gradient-to-br from-gray-900/90 via-slate-800/90 to-gray-900/90"
          }
        `}
      />

      {/* Particle effects for correct answers */}
      {isCorrect && phase !== "exiting" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating coins */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl animate-float-up"
              style={{
                left: `${8 + (i * 8)}%`,
                bottom: "-50px",
                animationDelay: `${i * 0.15}s`,
                animationDuration: `${2 + Math.random()}s`,
              }}
            >
              🪙
            </div>
          ))}
          
          {/* Sparkles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`sparkle-${i}`}
              className="absolute text-2xl animate-sparkle"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                animationDelay: `${i * 0.2}s`,
              }}
            >
              ✨
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div 
        className={`
          relative text-center transform transition-all duration-500
          ${phase === "entering" ? "scale-50 opacity-0" : "scale-100 opacity-100"}
          ${phase === "exiting" ? "scale-110" : ""}
        `}
      >
        {/* Icon */}
        <div 
          className={`
            text-8xl mb-6 
            ${isCorrect ? "animate-bounce" : "animate-shake"}
          `}
        >
          {isCorrect ? "🎉" : "😔"}
        </div>

        {/* Result text */}
        <h1 
          className={`
            text-5xl font-black mb-4 tracking-tight
            ${isCorrect 
              ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-300" 
              : "text-gray-400"
            }
          `}
        >
          {isCorrect ? "CORRECT!" : "WRONG!"}
        </h1>

        {/* Coins display */}
        <div 
          className={`
            transform transition-all duration-500
            ${showCoins ? "scale-100 opacity-100" : "scale-50 opacity-0"}
          `}
        >
          <div 
            className={`
              inline-flex items-center gap-3 px-8 py-4 rounded-2xl
              ${isCorrect 
                ? "bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-2 border-amber-400" 
                : "bg-gray-800/50 border-2 border-gray-600"
              }
            `}
          >
            <span className={`text-5xl ${isCorrect ? "animate-coin-spin" : ""}`}>🪙</span>
            <span 
              className={`
                text-5xl font-black tabular-nums
                ${isCorrect ? "text-amber-300" : "text-gray-500"}
              `}
            >
              +{isCorrect ? coinCount : 0}
            </span>
          </div>

          {/* Subtext */}
          <p 
            className={`
              mt-4 text-lg font-medium
              ${isCorrect ? "text-green-300" : "text-gray-500"}
            `}
          >
            {isCorrect ? "Great job! Keep going!" : "No coins this time. Try the next one!"}
          </p>
        </div>

        {/* Rolling indicator for correct */}
        {isCorrect && phase === "showing" && (
          <div className="mt-6 text-amber-200 text-sm font-medium animate-pulse">
            Rolling dice...
          </div>
        )}
      </div>
    </div>
  )
}
