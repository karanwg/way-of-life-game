/**
 * PonziModal - Gamble decision modal for chance/casino tiles
 * 
 * Shown when a player lands on a Ponzi/gamble tile.
 * Features a spin wheel that the player can click to spin.
 * The game is rigged - 75% chance to win (double coins), 25% chance to lose half.
 */

"use client"

import { useState, useCallback } from "react"
import type { PonziPromptData } from "@/lib/p2p-types"
import { SpinWheel } from "./spin-wheel"

interface PonziModalProps {
  data: PonziPromptData
  onChoice: (invest: boolean, spinResult?: boolean) => void
}

type ModalState = "initial" | "spinning" | "result"

export function PonziModal({ data, onChoice }: PonziModalProps) {
  const [state, setState] = useState<ModalState>("initial")
  const [spinResult, setSpinResult] = useState<boolean | null>(null)

  const potentialGain = data.currentCoins
  const potentialLoss = Math.floor(data.currentCoins / 2)

  const handleSpinResult = useCallback((won: boolean) => {
    setSpinResult(won)
    setState("result")
    // Small delay to show result before closing
    setTimeout(() => {
      onChoice(true, won)
    }, 2000)
  }, [onChoice])

  const handleSpinStart = useCallback(() => {
    setState("spinning")
  }, [])

  const handleSkip = useCallback(() => {
    if (state === "spinning") return
    onChoice(false)
  }, [state, onChoice])

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-gray-900 via-gray-850 to-gray-900 border-4 border-amber-500 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-bounce-in relative">
        {/* Decorative corner lights */}
        <div className="absolute top-3 left-3 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: '0.3s' }} />
        <div className="absolute bottom-3 left-3 w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.6s' }} />
        <div className="absolute bottom-3 right-3 w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: '0.9s' }} />
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎰</div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400">
            FORTUNE WHEEL
          </h2>
        </div>

        {/* Spin Wheel - centered */}
        {state !== "result" && (
          <div className="flex justify-center">
            <SpinWheel 
              onResult={handleSpinResult}
              onSpinStart={handleSpinStart}
              disabled={state !== "initial"}
            />
          </div>
        )}

        {/* Result display */}
        {state === "result" && spinResult !== null && (
          <div className={`
            text-center py-8 px-4 rounded-2xl animate-bounce-in
            ${spinResult 
              ? 'bg-gradient-to-b from-emerald-600/40 to-emerald-800/40 border-2 border-emerald-400' 
              : 'bg-gradient-to-b from-red-600/40 to-red-800/40 border-2 border-red-400'
            }
          `}>
            <div className="text-6xl mb-4">
              {spinResult ? '🎉' : '😢'}
            </div>
            <div className={`text-3xl font-black mb-2 ${spinResult ? 'text-emerald-300' : 'text-red-300'}`}>
              {spinResult ? 'YOU WIN!' : 'YOU LOSE!'}
            </div>
            <div className={`text-xl font-bold ${spinResult ? 'text-emerald-400' : 'text-red-400'}`}>
              {spinResult ? `+${potentialGain}` : `-${potentialLoss}`} 🪙
            </div>
          </div>
        )}

        {/* Skip Button */}
        {state === "initial" && (
          <div className="text-center mt-4">
            <button
              onClick={handleSkip}
              className="
                px-8 py-3 rounded-xl font-bold text-sm 
                bg-gray-800 border-2 border-gray-600 text-gray-400 
                transition-all hover:bg-gray-700 hover:border-gray-500 hover:text-gray-200
              "
            >
              Walk Away 🚶
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
