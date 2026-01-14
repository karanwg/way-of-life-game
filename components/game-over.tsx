"use client"

import type { Player } from "@/lib/types"
import { getPawnColor } from "./player-pawn"

interface GameOverProps {
  players: Player[]
  onPlayAgain: () => void
}

export function GameOver({ players, onPlayAgain }: GameOverProps) {
  const sortedPlayers = [...players].sort((a, b) => b.coins - a.coins)
  const topThree = sortedPlayers.slice(0, 3)
  const podiumOrder = topThree.length >= 3 ? [topThree[1], topThree[0], topThree[2]] : topThree
  const podiumHeights = ["h-20", "h-28", "h-16"]
  const medals = ["🥈", "🥇", "🥉"]

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-200 overflow-hidden">
      {/* Clouds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-10 left-20 w-64 h-32 bg-white rounded-full blur-3xl" />
        <div className="absolute top-32 right-32 w-48 h-24 bg-white rounded-full blur-3xl" />
      </div>
      
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute text-2xl animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
              opacity: 0.6,
            }}
          >
            {["🎉", "🎊", "✨", "🌟", "🪙"][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-full p-4">
        <div className="max-w-xl w-full">
          <div className="bg-[#FAF8F0] rounded-2xl border-4 border-amber-700/80 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-6 text-center">
              <h1 className="text-3xl font-black text-white mb-1">🏆 Game Over! 🏆</h1>
              <p className="text-green-100 font-medium">Thanks for playing Way of Life!</p>
            </div>
            
            <div className="p-6">
              {/* Podium */}
              {topThree.length > 0 && (
                <div className="flex items-end justify-center gap-3 mb-6">
                  {podiumOrder.map((player, displayIndex) => {
                    if (!player) return null
                    const actualIndex = displayIndex === 1 ? 0 : displayIndex === 0 ? 1 : 2
                    const pawnColor = getPawnColor(sortedPlayers.indexOf(player))

                    return (
                      <div key={player.id} className="flex flex-col items-center">
                        <div className="mb-2 text-center">
                          <span className="text-3xl block mb-1">{medals[displayIndex]}</span>
                          <div
                            className={`w-10 h-10 rounded-full bg-gradient-to-br ${pawnColor.bg} mx-auto mb-1 flex items-center justify-center text-white font-bold border-2 border-white shadow-md`}
                          >
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-gray-800 font-bold text-sm truncate max-w-[70px]">{player.name}</p>
                          <p className="text-amber-700 font-bold text-sm">🪙 {player.coins}</p>
                        </div>

                        <div
                          className={`
                            w-16 ${podiumHeights[displayIndex]}
                            ${displayIndex === 1 
                              ? "bg-gradient-to-t from-amber-600 to-amber-400 border-amber-700" 
                              : displayIndex === 0 
                                ? "bg-gradient-to-t from-gray-500 to-gray-400 border-gray-600" 
                                : "bg-gradient-to-t from-orange-700 to-orange-500 border-orange-800"}
                            rounded-t-lg flex items-center justify-center
                            border-2 border-b-0
                          `}
                        >
                          <span className="text-xl font-black text-white">{actualIndex + 1}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Other players */}
              {sortedPlayers.length > 3 && (
                <div className="mb-6">
                  <p className="text-amber-800 text-xs font-semibold mb-2 uppercase tracking-wider">Other Players</p>
                  <div className="space-y-2 max-h-28 overflow-y-auto">
                    {sortedPlayers.slice(3).map((player, index) => {
                      const pawnColor = getPawnColor(index + 3)
                      return (
                        <div key={player.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-amber-100">
                          <div className="flex items-center gap-3">
                            <span className="text-amber-600 font-bold w-5 text-sm">#{index + 4}</span>
                            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${pawnColor.bg} border border-white`} />
                            <span className="text-gray-800 font-medium text-sm">{player.name}</span>
                          </div>
                          <span className="text-amber-700 font-bold text-sm">🪙 {player.coins}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Play Again */}
              <button
                onClick={onPlayAgain}
                className="w-full py-4 text-lg font-bold text-white rounded-xl bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 shadow-lg shadow-green-800/30 border-b-4 border-green-800 transition-all hover:-translate-y-0.5"
              >
                🎮 Play Again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
