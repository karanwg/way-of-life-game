/**
 * AnswerResultOverlay - Dramatic full-screen animation for quiz answers
 * 
 * Correct: Shows rolling odometer-style digits for coin counter
 * Wrong: Shows current coins with red glow, shake animation
 */

"use client"

import { useEffect, useState, useMemo } from "react"
import { playChaChingSound } from "@/lib/sounds"

interface AnswerResultOverlayProps {
  isCorrect: boolean
  coins: number // Coins gained (300 for correct, 0 for wrong)
  currentCoins: number // Player's current coin balance BEFORE this answer
  onComplete: () => void
}

// Rolling digit component - scrolls through numbers like an odometer
function RollingDigit({ 
  from, 
  to, 
  delay,
  duration = 1600,
  isActive 
}: { 
  from: number
  to: number
  delay: number
  duration?: number
  isActive: boolean 
}) {
  const [translateY, setTranslateY] = useState(0)
  const digitHeight = 1.2 // em

  // Build the sequence of digits to scroll through
  const digitSequence = useMemo(() => {
    const seq: number[] = []
    let current = from
    seq.push(current)
    
    if (from === to) {
      // Same digit - do a full loop (go through all 10 digits and back)
      for (let i = 1; i <= 10; i++) {
        seq.push((from + i) % 10)
      }
    } else {
      // Different digits - scroll from 'from' to 'to'
      while (current !== to) {
        current = (current + 1) % 10
        seq.push(current)
      }
    }
    
    return seq
  }, [from, to])

  // Total distance to scroll (in digit heights)
  const totalScrollDistance = digitSequence.length - 1

  useEffect(() => {
    if (!isActive) return

    const startTimer = setTimeout(() => {
      const startTime = Date.now()
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Ease out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3)
        
        // Calculate translateY in em units
        const scrollAmount = eased * totalScrollDistance * digitHeight
        setTranslateY(-scrollAmount)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          // Ensure we land exactly on the target
          setTranslateY(-totalScrollDistance * digitHeight)
        }
      }
      
      requestAnimationFrame(animate)
    }, delay)

    return () => clearTimeout(startTimer)
  }, [isActive, delay, duration, totalScrollDistance, digitHeight])

  return (
    <div 
      className="relative overflow-hidden"
      style={{
        width: "0.6em",
        height: `${digitHeight}em`,
      }}
    >
      <div 
        className="absolute w-full"
        style={{
          transform: `translateY(${translateY}em)`,
        }}
      >
        {digitSequence.map((digit, i) => (
          <div 
            key={i}
            className="flex items-center justify-center font-black text-green-300"
            style={{ height: `${digitHeight}em` }}
          >
            {digit}
          </div>
        ))}
      </div>
    </div>
  )
}

// Parse number into array of digits with their positions
function getDigits(num: number): number[] {
  return num.toString().split("").map(d => parseInt(d))
}

// Rolling number display
function RollingNumber({ from, to, isActive }: { from: number; to: number; isActive: boolean }) {
  const fromStr = from.toLocaleString()
  const toStr = to.toLocaleString()
  
  // Pad to same length
  const maxLen = Math.max(fromStr.replace(/,/g, "").length, toStr.replace(/,/g, "").length)
  const fromDigits = getDigits(from)
  const toDigits = getDigits(to)
  
  // Pad from digits with leading zeros if needed
  while (fromDigits.length < toDigits.length) {
    fromDigits.unshift(0)
  }

  // Format with commas
  const formattedTo = to.toLocaleString()
  let digitIndex = 0
  
  return (
    <div className="flex items-center text-4xl tabular-nums">
      {formattedTo.split("").map((char, i) => {
        if (char === ",") {
          return <span key={i} className="text-green-300 font-black">,</span>
        }
        
        const fromDigit = fromDigits[digitIndex] || 0
        const toDigit = toDigits[digitIndex] || 0
        digitIndex++
        
        return (
          <RollingDigit
            key={i}
            from={fromDigit}
            to={toDigit}
            delay={digitIndex * 100}
            duration={1200 + digitIndex * 100}
            isActive={isActive}
          />
        )
      })}
    </div>
  )
}

export function AnswerResultOverlay({ isCorrect, coins, currentCoins, onComplete }: AnswerResultOverlayProps) {
  const [phase, setPhase] = useState<"entering" | "showing" | "exiting">("entering")
  const [showCoins, setShowCoins] = useState(false)
  const [displayedCoins, setDisplayedCoins] = useState(currentCoins)
  const [wrongShake, setWrongShake] = useState(false)
  const [rollActive, setRollActive] = useState(false)

  const targetCoins = currentCoins + coins

  useEffect(() => {
    // Play sound for correct answers
    if (isCorrect) {
      playChaChingSound()
    }

    // Phase 1: Enter animation
    const enterTimer = setTimeout(() => {
      setPhase("showing")
      setShowCoins(true)
      
      if (isCorrect && coins > 0) {
        // Start rolling animation
        setRollActive(true)
      } else {
        // Wrong answer animation - shake
        setDisplayedCoins(currentCoins)
        setWrongShake(true)
      }
    }, 350)

    // Phase 2: Show for a moment (extended for rolling animation)
    const showTimer = setTimeout(() => {
      setPhase("exiting")
    }, 2400)

    // Phase 3: Exit and callback
    const exitTimer = setTimeout(() => {
      onComplete()
    }, 2900)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(showTimer)
      clearTimeout(exitTimer)
    }
  }, [isCorrect, coins, currentCoins, onComplete])

  // Inline styles for wrong answer shake animation
  const getWrongCardStyle = (): React.CSSProperties => {
    if (!wrongShake) return { borderRadius: "1rem" }
    return {
      borderRadius: "1rem",
      animation: "wrong-violent-shake 0.5s ease-out",
      boxShadow: "0 0 40px rgba(239, 68, 68, 1), 0 0 80px rgba(239, 68, 68, 0.6)",
    }
  }

  return (
    <div 
      className={`
        fixed inset-0 z-[60] flex items-center justify-center
        transition-opacity duration-500
        ${phase === "entering" ? "opacity-0" : "opacity-100"}
        ${phase === "exiting" ? "opacity-0" : ""}
      `}
    >
      {/* Background */}
      <div 
        className={`
          absolute inset-0 transition-all duration-500
          ${isCorrect 
            ? "bg-gradient-to-br from-green-900/90 via-emerald-800/90 to-green-900/90" 
            : wrongShake
              ? "bg-gradient-to-br from-red-950/95 via-gray-900/95 to-red-950/95"
              : "bg-gradient-to-br from-gray-900/90 via-slate-800/90 to-gray-900/90"
          }
        `}
      />

      {/* Particle effects for correct answers - reduced and slower */}
      {isCorrect && phase !== "exiting" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating coins */}
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl animate-float-up"
              style={{
                left: `${8 + (i * 9)}%`,
                bottom: "-50px",
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${2.5 + Math.random() * 0.5}s`,
              }}
            >
              🪙
            </div>
          ))}
          
          {/* Sparkles - fewer and slower */}
          {[...Array(6)].map((_, i) => (
            <div
              key={`sparkle-${i}`}
              className="absolute text-2xl animate-sparkle"
              style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${15 + Math.random() * 70}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            >
              ✨
            </div>
          ))}
        </div>
      )}

      {/* Failure effects for wrong answers */}
      {!isCorrect && wrongShake && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Cracking effect - lines radiating from center */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`crack-${i}`}
              className="absolute left-1/2 top-1/2"
              style={{
                width: "3px",
                height: "80px",
                background: "linear-gradient(to bottom, rgba(239, 68, 68, 0.8), transparent)",
                transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
                transformOrigin: "center top",
                animation: "crack-expand 0.3s ease-out forwards",
                animationDelay: `${i * 0.03}s`,
              }}
            />
          ))}
          
          {/* Falling X marks */}
          {[...Array(10)].map((_, i) => (
            <div
              key={`x-${i}`}
              className="absolute text-4xl"
              style={{
                left: `${10 + i * 9}%`,
                top: `${20 + (i % 3) * 10}%`,
                animation: "wrong-fall 1s ease-in forwards",
                animationDelay: `${i * 0.06}s`,
                opacity: 0,
              }}
            >
              ❌
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div 
        className={`
          relative text-center
          ${phase === "entering" ? "scale-50 opacity-0" : "scale-100 opacity-100"}
          ${phase === "exiting" ? "opacity-0" : ""}
        `}
        style={{
          transition: "transform 0.5s, opacity 0.5s",
        }}
      >
        {/* Icon */}
        <div 
          className={`text-8xl mb-6 ${isCorrect ? "animate-bounce" : ""}`}
          style={{
            animation: !isCorrect && wrongShake 
              ? "wrong-icon-shake 0.3s ease-in-out" 
              : undefined,
          }}
        >
          {isCorrect ? "🎉" : "😔"}
        </div>

        {/* Result text */}
        <h1 
          className={`
            text-5xl font-black mb-4 tracking-tight
            ${isCorrect 
              ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-300" 
              : wrongShake
                ? "text-red-400"
                : "text-gray-400"
            }
          `}
          style={{
            animation: !isCorrect && wrongShake ? "wrong-text-shake 0.5s ease-out" : "none",
          }}
        >
          {isCorrect ? "CORRECT!" : "WRONG!"}
        </h1>

        {/* Coins gained display */}
        <div 
          className={`
            mb-4
            ${showCoins ? "scale-100 opacity-100" : "scale-50 opacity-0"}
          `}
          style={{ transition: "transform 0.5s, opacity 0.5s" }}
        >
          <div 
            className={`
              inline-flex items-center gap-3 px-6 py-2 rounded-xl
              ${isCorrect 
                ? "bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-2 border-amber-400" 
                : "bg-gray-800/50 border-2 border-gray-600"
              }
            `}
          >
            <span className={`text-3xl ${isCorrect ? "animate-coin-spin" : ""}`}>🪙</span>
            <span 
              className={`
                text-3xl font-bold
                ${isCorrect ? "text-amber-300" : "text-gray-500"}
              `}
            >
              +{isCorrect ? coins : 0}
            </span>
          </div>
        </div>

        {/* Current balance counter */}
        <div 
          className={`
            ${showCoins ? "opacity-100" : "opacity-0"}
          `}
          style={{ 
            transition: showCoins && !wrongShake ? "opacity 0.5s" : "none",
          }}
        >
          <div 
            className={`
              inline-flex items-center gap-4 px-10 py-5 rounded-2xl
              ${isCorrect 
                ? "bg-gradient-to-r from-green-600/40 to-emerald-500/40 border-2 border-green-400 shadow-lg shadow-green-500/20" 
                : wrongShake
                  ? "bg-gradient-to-r from-red-900/80 to-red-800/80 border-4 border-red-500"
                  : "bg-gray-800/60 border-2 border-gray-600"
              }
            `}
            style={!isCorrect ? getWrongCardStyle() : { borderRadius: "1rem" }}
          >
            <span 
              className="text-4xl"
              style={{
                animation: wrongShake ? "wrong-money-shake 0.5s ease-out" : "none",
              }}
            >
              💰
            </span>
            <div className="flex flex-col items-start">
              <span className={`text-xs uppercase tracking-wider font-medium ${wrongShake && !isCorrect ? "text-red-300" : "text-gray-400"}`}>
                {isCorrect ? "New Balance" : "Balance"}
              </span>
              
              {/* Rolling digits for correct, static for wrong */}
              {isCorrect ? (
                <RollingNumber from={currentCoins} to={targetCoins} isActive={rollActive} />
              ) : (
                <span 
                  className={`
                    text-4xl font-black tabular-nums
                    ${wrongShake ? "text-red-300" : "text-gray-400"}
                  `}
                  style={{
                    animation: wrongShake ? "wrong-number-flicker 0.5s ease-out" : "none",
                  }}
                >
                  {displayedCoins.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          
        </div>

        {/* Subtext */}
        <p 
          className={`
            mt-5 text-lg font-medium
            ${isCorrect ? "text-green-300" : "text-gray-400"}
          `}
        >
          {isCorrect ? "Great job!" : "No coins, but you still move!"}
        </p>
      </div>

      {/* Inject keyframes for animations */}
      <style jsx>{`
        @keyframes wrong-violent-shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          10% { transform: translateX(-15px) rotate(-3deg); }
          20% { transform: translateX(15px) rotate(3deg); }
          30% { transform: translateX(-12px) rotate(-2deg); }
          40% { transform: translateX(12px) rotate(2deg); }
          50% { transform: translateX(-8px) rotate(-1deg); }
          60% { transform: translateX(8px) rotate(1deg); }
          70% { transform: translateX(-5px) rotate(-0.5deg); }
          80% { transform: translateX(5px) rotate(0.5deg); }
          90% { transform: translateX(-2px) rotate(0); }
        }
        
        @keyframes wrong-icon-shake {
          0%, 100% { transform: rotate(0); }
          25% { transform: rotate(-20deg); }
          75% { transform: rotate(20deg); }
        }
        
        @keyframes wrong-icon-sad {
          0% { transform: scale(1) rotate(0); }
          50% { transform: scale(1.2) rotate(-10deg); }
          100% { transform: scale(0.9) rotate(5deg) translateY(10px); }
        }
        
        @keyframes wrong-text-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        
        @keyframes wrong-money-shake {
          0%, 100% { transform: rotate(0) scale(1); }
          25% { transform: rotate(-15deg) scale(1.1); }
          50% { transform: rotate(15deg) scale(1.1); }
          75% { transform: rotate(-10deg) scale(1.05); }
        }
        
        @keyframes wrong-money-cry {
          0% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(3px); }
        }
        
        @keyframes wrong-number-flicker {
          0%, 100% { opacity: 1; }
          20% { opacity: 0.3; }
          40% { opacity: 1; }
          60% { opacity: 0.5; }
          80% { opacity: 1; }
        }
        
        @keyframes crack-expand {
          0% { height: 0; opacity: 0; }
          50% { opacity: 1; }
          100% { height: 120px; opacity: 0; }
        }
        
        @keyframes wrong-fall {
          0% { transform: translateY(0) rotate(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(200px) rotate(45deg); opacity: 0; }
        }
        
        @keyframes fade-slide-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
