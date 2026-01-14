"use client"

import type { PonziPromptData } from "@/lib/p2p-types"

interface PonziModalProps {
  data: PonziPromptData
  onChoice: (invest: boolean) => void
}

export function PonziModal({ data, onChoice }: PonziModalProps) {
  const potentialGain = data.currentCoins // Double = gain same amount
  const potentialLoss = Math.floor(data.currentCoins / 2)

  return (
    <div className="fixed inset-0 bg-emerald-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-purple-400 rounded-2xl p-6 max-w-md w-full shadow-playful animate-bounce-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2 animate-wiggle">🎰</div>
          <h2 className="text-2xl font-black text-purple-600">
            Chance Card!
          </h2>
          <p className="text-purple-700 mt-2 font-medium">
            Take a gamble on your fortune...
          </p>
        </div>

        {/* Current coins display */}
        <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4 mb-6 text-center">
          <div className="text-sm text-amber-700 font-medium">Your Current Balance</div>
          <div className="text-3xl font-black text-amber-600">
            {data.currentCoins} 🪙
          </div>
        </div>

        {/* Risk/Reward Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-100 border-2 border-emerald-400 rounded-xl p-4 text-center">
            <div className="text-emerald-700 text-sm font-bold mb-1">WIN (75%) 🍀</div>
            <div className="text-2xl font-black text-emerald-600">
              +{potentialGain} 🪙
            </div>
            <div className="text-xs text-emerald-600 mt-1 font-medium">Double up!</div>
          </div>
          <div className="bg-red-100 border-2 border-red-400 rounded-xl p-4 text-center">
            <div className="text-red-700 text-sm font-bold mb-1">LOSE (25%) 😬</div>
            <div className="text-2xl font-black text-red-600">
              -{potentialLoss} 🪙
            </div>
            <div className="text-xs text-red-600 mt-1 font-medium">Lose half</div>
          </div>
        </div>

        {/* Odds display */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-emerald-100 border-2 border-emerald-400 rounded-full px-4 py-2">
            <span className="text-xl">🍀</span>
            <span className="text-emerald-700 font-bold">75% Win Rate!</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onChoice(false)}
            className="py-4 rounded-xl font-black text-lg bg-gray-200 border-2 border-gray-300 text-gray-600 hover:bg-gray-300 transition-all"
          >
            Skip 🚶
          </button>
          <button
            onClick={() => onChoice(true)}
            className="py-4 rounded-xl font-black text-lg bg-purple-500 border-2 border-purple-600 text-white hover:bg-purple-600 transition-all shadow-playful hover:-translate-y-0.5"
          >
            Gamble! 🎲
          </button>
        </div>

        <p className="text-center text-xs text-purple-400 mt-4 font-medium">
          "Feeling lucky today?" 🍀
        </p>
      </div>
    </div>
  )
}
