"use client"

import type { Player } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { getPawnColor } from "./player-pawn"

interface GameOverProps {
  players: Player[]
  onPlayAgain: () => void
}

export function GameOver({ players, onPlayAgain }: GameOverProps) {
  const sortedPlayers = [...players].sort((a, b) => b.coins - a.coins)
  const topThree = sortedPlayers.slice(0, 3)

  const podiumOrder = topThree.length >= 3 ? [topThree[1], topThree[0], topThree[2]] : topThree
  const podiumHeights = ["h-24", "h-32", "h-20"]
  const podiumColors = ["from-gray-400 to-gray-500", "from-yellow-400 to-amber-500", "from-orange-600 to-orange-700"]
  const medals = ["🥈", "🥇", "🥉"]

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex items-center justify-center p-4 overflow-hidden">
      {/* Confetti background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            {["🎉", "🎊", "✨", "🌟", "💫", "🪙"][Math.floor(Math.random() * 6)]}
          </div>
        ))}
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
              Game Over!
            </span>
          </h1>
          <p className="text-xl text-purple-300">Thanks for playing Way of Life</p>
        </div>

        {/* Podium */}
        {topThree.length > 0 && (
          <div className="flex items-end justify-center gap-4 mb-8">
            {podiumOrder.map((player, displayIndex) => {
              if (!player) return null
              const actualIndex = displayIndex === 1 ? 0 : displayIndex === 0 ? 1 : 2
              const pawnColor = getPawnColor(sortedPlayers.indexOf(player))

              return (
                <div key={player.id} className="flex flex-col items-center">
                  {/* Player info */}
                  <div className="mb-2 text-center">
                    <span className="text-4xl mb-1 block">{medals[displayIndex]}</span>
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${pawnColor.bg} mx-auto mb-1 flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                      style={{ boxShadow: `0 0 20px ${pawnColor.shadow}` }}
                    >
                      {player.name.charAt(0)}
                    </div>
                    <p className="text-white font-bold text-sm truncate max-w-[80px]">{player.name}</p>
                    <p className="text-yellow-400 font-bold flex items-center justify-center gap-1">
                      <span>🪙</span>
                      {player.coins}
                    </p>
                  </div>

                  {/* Podium block */}
                  <div
                    className={`
                      w-20 ${podiumHeights[displayIndex]}
                      bg-gradient-to-t ${podiumColors[displayIndex]}
                      rounded-t-lg flex items-center justify-center
                      shadow-lg
                    `}
                  >
                    <span className="text-2xl font-black text-white/80">{actualIndex + 1}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Full leaderboard */}
        {sortedPlayers.length > 3 && (
          <div className="mb-8 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
            <h2 className="text-lg font-bold text-white mb-3">Final Standings</h2>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {sortedPlayers.slice(3).map((player, index) => {
                const pawnColor = getPawnColor(index + 3)
                return (
                  <div key={player.id} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-purple-400 font-bold w-6">#{index + 4}</span>
                      <div
                        className={`w-5 h-5 rounded-full bg-gradient-to-br ${pawnColor.bg}`}
                        style={{ boxShadow: `0 0 6px ${pawnColor.shadow}` }}
                      />
                      <span className="text-white font-medium text-sm">{player.name}</span>
                    </div>
                    <span className="text-yellow-400 font-bold text-sm flex items-center gap-1">
                      <span>🪙</span>
                      {player.coins}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Play Again button */}
        <Button
          onClick={onPlayAgain}
          size="lg"
          className="px-12 py-6 text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg hover:shadow-pink-500/30 transition-all"
        >
          🎮 Play Again
        </Button>
      </div>
    </div>
  )
}
