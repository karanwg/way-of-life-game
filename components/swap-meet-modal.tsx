/**
 * SwapMeetModal - Player selects who to swap coins with
 * 
 * Similar to HeistModal/PoliceModal but for coin swapping.
 * Shows all available targets with their coin counts.
 */

"use client"

import { useState } from "react"
import type { SwapMeetPromptData } from "@/lib/p2p-types"

interface SwapMeetModalProps {
  data: SwapMeetPromptData
  onSelectTarget: (targetId: string) => void
}

export function SwapMeetModal({ data, onSelectTarget }: SwapMeetModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSelect = (targetId: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    onSelectTarget(targetId)
  }

  // If no targets available
  if (data.availableTargets.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[#FAF8F0] rounded-2xl p-8 max-w-md shadow-2xl border-4 border-amber-700/80 text-center">
          <span className="text-5xl block mb-4">🔄</span>
          <h2 className="text-2xl font-black text-amber-800 mb-4">Swap Meet</h2>
          <p className="text-gray-600 mb-6">No players available to swap with!</p>
          <button
            onClick={() => handleSelect("")}
            disabled={isSubmitting}
            className="px-6 py-3 bg-gradient-to-b from-amber-500 to-amber-600 text-white font-bold rounded-xl border-b-4 border-amber-700 hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  // Sort targets by coins (descending) to show richest first
  const sortedTargets = [...data.availableTargets].sort((a, b) => b.coins - a.coins)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#FAF8F0] rounded-2xl p-8 max-w-lg shadow-2xl border-4 border-amber-700/80">
        <div className="text-center mb-6">
          <span className="text-5xl block mb-2">🔄</span>
          <h2 className="text-2xl font-black text-amber-800">Swap Meet!</h2>
          <p className="text-gray-600 mt-2">
            Choose someone to swap coins with
          </p>
          <p className="text-amber-700 font-bold mt-2">
            Your coins: {data.currentCoins} 🪙
          </p>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {sortedTargets.map((target) => {
            const diff = target.coins - data.currentCoins
            const isGoodDeal = diff > 0
            
            return (
              <button
                key={target.id}
                onClick={() => handleSelect(target.id)}
                disabled={isSubmitting}
                className={`
                  w-full p-4 rounded-xl transition-all
                  ${isGoodDeal 
                    ? "bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-400 hover:border-green-500" 
                    : "bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 hover:border-red-400"}
                  hover:-translate-y-0.5 hover:shadow-lg
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                  flex items-center justify-between
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👤</span>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">{target.name}</p>
                    <p className="text-sm text-gray-600">{target.coins} coins</p>
                  </div>
                </div>
                <div className={`text-lg font-black ${isGoodDeal ? "text-green-600" : "text-red-600"}`}>
                  {diff >= 0 ? "+" : ""}{diff} 🪙
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => handleSelect("")}
            disabled={isSubmitting}
            className="w-full py-3 text-gray-600 font-medium hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50"
          >
            Skip - Keep my coins
          </button>
        </div>
      </div>
    </div>
  )
}
