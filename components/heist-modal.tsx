"use client"

import { useState } from "react"
import type { HeistPromptData } from "@/lib/p2p-types"

interface HeistModalProps {
  data: HeistPromptData
  onSelectTarget: (targetId: string) => void
}

export function HeistModal({ data, onSelectTarget }: HeistModalProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)

  const handleConfirm = () => {
    if (selectedTarget) {
      onSelectTarget(selectedTarget)
    }
  }

  const isHeavy = data.type === "heavy"

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-slate-900 border-2 border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-bounce-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{isHeavy ? "🔫" : "🎭"}</div>
          <h2 className="text-2xl font-bold text-red-400">
            {isHeavy ? "Heist (Heavy)" : "Heist (Light)"}
          </h2>
          <p className="text-gray-400 mt-2">
            {isHeavy
              ? "Steal 50% of a player's coins (leaving them at least 50)"
              : "Steal 100 coins from a player"}
          </p>
        </div>

        {/* Target Selection */}
        <div className="space-y-2 mb-6">
          <p className="text-sm text-gray-300 mb-3">Select your target:</p>
          {data.availableTargets.map((target) => {
            const isSelected = selectedTarget === target.id
            const stealAmount = isHeavy
              ? Math.min(Math.floor(target.coins * 0.5), Math.max(0, target.coins - 50))
              : Math.min(100, target.coins)

            return (
              <button
                key={target.id}
                onClick={() => setSelectedTarget(target.id)}
                className={`
                  w-full p-4 rounded-xl border-2 transition-all
                  flex items-center justify-between
                  ${
                    isSelected
                      ? "border-red-500 bg-red-500/20"
                      : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center text-lg">
                    👤
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white">{target.name}</div>
                    <div className="text-sm text-gray-400">
                      {target.coins} coins
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-bold">
                    -{stealAmount} 🪙
                  </div>
                  {isSelected && (
                    <div className="text-xs text-green-400">Selected</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={!selectedTarget}
          className={`
            w-full py-3 rounded-xl font-bold text-lg transition-all
            ${
              selectedTarget
                ? "bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          {selectedTarget ? "Execute Heist 🎯" : "Select a Target"}
        </button>
      </div>
    </div>
  )
}
