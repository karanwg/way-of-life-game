"use client"

import type { PonziPromptData } from "@/lib/p2p-types"

interface PonziModalProps {
  data: PonziPromptData
  onChoice: (invest: boolean) => void
}

export function PonziModal({ data, onChoice }: PonziModalProps) {
  const potentialGain = Math.floor(data.currentCoins * 0.5)
  const potentialLoss = Math.floor(data.currentCoins * 0.5)

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-purple-950 border-2 border-purple-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-bounce-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎰</div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Ponzi Scheme
          </h2>
          <p className="text-gray-400 mt-2">
            A sketchy guy in a suit approaches you with an "opportunity"...
          </p>
        </div>

        {/* Current coins display */}
        <div className="bg-black/30 rounded-xl p-4 mb-6 text-center">
          <div className="text-sm text-gray-400">Your Current Balance</div>
          <div className="text-3xl font-bold text-yellow-400">
            {data.currentCoins} 🪙
          </div>
        </div>

        {/* Risk/Reward Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
            <div className="text-green-400 text-sm mb-1">If You Win</div>
            <div className="text-2xl font-bold text-green-400">
              +{potentialGain} 🪙
            </div>
            <div className="text-xs text-gray-400 mt-1">50% of your coins</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <div className="text-red-400 text-sm mb-1">If You Lose</div>
            <div className="text-2xl font-bold text-red-400">
              -{potentialLoss} 🪙
            </div>
            <div className="text-xs text-gray-400 mt-1">50% of your coins</div>
          </div>
        </div>

        {/* Odds display */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-2">
            <span className="text-yellow-400">⚖️</span>
            <span className="text-yellow-300 font-semibold">50/50 Odds</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onChoice(false)}
            className="py-4 rounded-xl font-bold text-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-all"
          >
            Skip 🚶
          </button>
          <button
            onClick={() => onChoice(true)}
            className="py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Invest 💰
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          "Trust me bro, this is totally legit"
        </p>
      </div>
    </div>
  )
}
