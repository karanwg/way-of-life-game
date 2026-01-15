/**
 * PoliceModal - Target selection modal for police station tile
 * 
 * Shown when a player lands on the police station tile.
 * Player selects someone to "report", causing them to lose up to 300 coins.
 * 
 * This is a powerful tile that can significantly impact another player's score.
 */

"use client"

import { useState } from "react"
import type { PolicePromptData } from "@/lib/p2p-types"

interface PoliceModalProps {
  data: PolicePromptData
  onSelectTarget: (targetId: string) => void
}

export function PoliceModal({ data, onSelectTarget }: PoliceModalProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = () => {
    if (selectedTarget && !isSubmitting) {
      setIsSubmitting(true)
      onSelectTarget(selectedTarget)
    }
  }

  // Handle case where there are no valid targets
  if (data.availableTargets.length === 0) {
    return (
      <div className="fixed inset-0 bg-emerald-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-sky-400 rounded-2xl p-6 max-w-md w-full shadow-playful animate-bounce-in">
          <div className="text-center">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-2xl font-black text-sky-600 mb-2">No One to Report!</h2>
            <p className="text-sky-700 mb-4">There's no one to snitch on.</p>
            <button
              onClick={() => onSelectTarget("")}
              className="w-full py-3 rounded-xl font-black text-lg bg-gray-200 border-2 border-gray-300 text-gray-600 hover:bg-gray-300"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-emerald-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-sky-400 rounded-2xl p-6 max-w-md w-full shadow-playful animate-bounce-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2 animate-wiggle">🚔</div>
          <h2 className="text-2xl font-black text-sky-600">
            Police Station!
          </h2>
          <p className="text-sky-700 mt-2 font-medium">
            Report someone! They lose up to 300 coins!
          </p>
        </div>

        {/* Target Selection */}
        <div className="space-y-2 mb-6">
          <p className="text-sm text-gray-600 mb-3 font-medium">🎯 Who will you report?</p>
          {data.availableTargets.map((target) => {
            const isSelected = selectedTarget === target.id
            const coinsLost = Math.min(300, target.coins)

            return (
              <button
                key={target.id}
                onClick={() => !isSubmitting && setSelectedTarget(target.id)}
                disabled={isSubmitting}
                className={`
                  w-full p-4 rounded-xl border-3 transition-all
                  flex items-center justify-between
                  ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
                  ${isSelected
                    ? "border-sky-500 bg-sky-100 shadow-playful"
                    : "border-sky-200 bg-sky-50 hover:border-sky-300 hover:bg-sky-100"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-300 to-sky-400 flex items-center justify-center text-lg shadow-sm">
                    👤
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-800">{target.name}</div>
                    <div className="text-sm text-sky-600 font-medium">
                      🪙 {target.coins}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-500 font-black text-lg">
                    -{coinsLost} 🪙
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
          disabled={!selectedTarget || isSubmitting}
          className={`
            w-full py-3 rounded-xl font-black text-lg transition-all border-2
            ${selectedTarget && !isSubmitting
              ? "bg-sky-500 border-sky-600 text-white hover:bg-sky-600 shadow-playful hover:-translate-y-0.5"
              : "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          {isSubmitting ? "Reporting..." : selectedTarget ? "Report! 🚨" : "Select a Target"}
        </button>
      </div>
    </div>
  )
}
