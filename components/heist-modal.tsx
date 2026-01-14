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

  const getHeistTitle = () => {
    switch (data.type) {
      case "10": return "Pickpocket"
      case "100": return "Quick Heist"
      case "50": return "Grand Heist"
      default: return "Heist"
    }
  }

  const getHeistDescription = () => {
    switch (data.type) {
      case "10": return "Skim 10% off someone's wallet"
      case "100": return "Take 100 coins from someone"
      case "50": return "Steal 50% of someone's fortune"
      default: return "Steal coins from someone"
    }
  }

  const getHeistEmoji = () => {
    switch (data.type) {
      case "10": return "🤏"
      case "100": return "🎭"
      case "50": return "🔫"
      default: return "💰"
    }
  }

  const calculateStealAmount = (targetCoins: number) => {
    switch (data.type) {
      case "10": return Math.floor(targetCoins * 0.1)
      case "100": return Math.min(100, targetCoins)
      case "50": return Math.floor(targetCoins * 0.5)
      default: return 0
    }
  }

  return (
    <div className="fixed inset-0 bg-emerald-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-orange-400 rounded-2xl p-6 max-w-md w-full shadow-playful animate-bounce-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2 animate-wiggle">{getHeistEmoji()}</div>
          <h2 className="text-2xl font-black text-orange-600">
            {getHeistTitle()}!
          </h2>
          <p className="text-amber-700 mt-2 font-medium">
            {getHeistDescription()}
          </p>
        </div>

        {/* Target Selection */}
        <div className="space-y-2 mb-6">
          <p className="text-sm text-gray-600 mb-3 font-medium">🎯 Pick your target:</p>
          {data.availableTargets.map((target) => {
            const isSelected = selectedTarget === target.id
            const stealAmount = calculateStealAmount(target.coins)

            return (
              <button
                key={target.id}
                onClick={() => setSelectedTarget(target.id)}
                className={`
                  w-full p-4 rounded-xl border-3 transition-all
                  flex items-center justify-between
                  ${
                    isSelected
                      ? "border-orange-500 bg-orange-100 shadow-playful"
                      : "border-amber-200 bg-amber-50 hover:border-orange-300 hover:bg-orange-50"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-400 flex items-center justify-center text-lg shadow-sm">
                    👤
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-800">{target.name}</div>
                    <div className="text-sm text-amber-600 font-medium">
                      🪙 {target.coins}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-orange-600 font-black text-lg">
                    +{stealAmount} 🪙
                  </div>
                  {isSelected && (
                    <div className="text-xs text-emerald-600 font-bold">✓ Selected</div>
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
            w-full py-3 rounded-xl font-black text-lg transition-all border-2
            ${
              selectedTarget
                ? "bg-orange-500 border-orange-600 text-white hover:bg-orange-600 shadow-playful hover:-translate-y-0.5"
                : "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          {selectedTarget ? "Execute Heist! 🎯" : "Select a Target"}
        </button>
      </div>
    </div>
  )
}
