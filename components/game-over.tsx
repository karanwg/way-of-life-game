"use client"

import type { Player } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, Award } from "lucide-react"

interface GameOverProps {
  players: Player[]
  onPlayAgain: () => void
}

export function GameOver({ players, onPlayAgain }: GameOverProps) {
  const sortedPlayers = [...players].sort((a, b) => b.coins - a.coins)
  const topThree = sortedPlayers.slice(0, 3)
  const medals = [
    { icon: Trophy, color: "text-yellow-500", label: "1st Place" },
    { icon: Medal, color: "text-gray-400", label: "2nd Place" },
    { icon: Award, color: "text-orange-600", label: "3rd Place" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">Game Complete! 🎉</h1>
          <p className="text-xl text-slate-300">Thanks for playing Way of Life</p>
        </div>

        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {topThree.map((player, index) => {
            const medal = medals[index]
            const Icon = medal.icon
            return (
              <div
                key={player.id}
                className="bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600 rounded-lg p-6 text-center"
              >
                <Icon className={`w-8 h-8 mx-auto mb-3 ${medal.color}`} />
                <p className="text-sm text-slate-300 mb-2">{medal.label}</p>
                <p className="text-xl font-bold text-white">{player.name}</p>
                <p className="text-2xl font-bold text-primary mt-2">{player.coins}</p>
                <p className="text-xs text-slate-400">coins</p>
              </div>
            )
          })}
        </div>

        {/* Full Leaderboard */}
        {sortedPlayers.length > 3 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">Final Leaderboard</h2>
            <div className="bg-slate-800 border border-slate-600 rounded-lg overflow-hidden">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between px-6 py-4 border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400 font-bold w-8">{index + 1}</span>
                    <span className="text-white font-semibold">{player.name}</span>
                  </div>
                  <span className="text-primary font-bold text-lg">{player.coins}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Play Again Button */}
        <div className="text-center">
          <Button onClick={onPlayAgain} size="lg" className="px-8">
            Play Again
          </Button>
        </div>
      </div>
    </div>
  )
}
