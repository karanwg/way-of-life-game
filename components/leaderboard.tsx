"use client"

import type { Player } from "@/lib/types"
import { getPawnColor } from "./player-pawn"

interface LeaderboardProps {
  players: Player[]
}

export function Leaderboard({ players }: LeaderboardProps) {
  const getMedalEmoji = (index: number) => {
    if (index === 0) return "🥇"
    if (index === 1) return "🥈"
    if (index === 2) return "🥉"
    return `#${index + 1}`
  }

  return (
    <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/80 backdrop-blur-sm border border-purple-500/30 rounded-xl p-3 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-500/30">
        <span className="text-xl">🏆</span>
        <h2 className="font-bold text-white text-sm">Leaderboard</h2>
      </div>

      {/* Player list */}
      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-4">
            <span className="text-3xl mb-2">👀</span>
            <p className="text-xs text-purple-300">Waiting for players...</p>
          </div>
        ) : (
          players.map((player, index) => {
            const pawnColor = getPawnColor(index)
            const isTop3 = index < 3

            return (
              <div
                key={player.id}
                className={`
                  flex items-center gap-2 p-2 rounded-lg
                  transition-all duration-300
                  ${
                    isTop3
                      ? "bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-transparent border border-yellow-500/30"
                      : "bg-white/5 hover:bg-white/10"
                  }
                `}
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-7 text-center">
                  <span className={`text-sm ${isTop3 ? "" : "text-purple-400"}`}>{getMedalEmoji(index)}</span>
                </div>

                {/* Player color indicator */}
                <div
                  className={`
                    flex-shrink-0 w-4 h-4 rounded-full
                    bg-gradient-to-br ${pawnColor.bg}
                    shadow-sm
                  `}
                  style={{ boxShadow: `0 0 8px ${pawnColor.shadow}` }}
                />

                {/* Name */}
                <span className="text-xs font-medium text-white truncate flex-1">{player.name}</span>

                {/* Coins */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-sm">🪙</span>
                  <span
                    className={`
                    text-xs font-bold
                    ${player.coins >= 0 ? "text-yellow-400" : "text-red-400"}
                  `}
                  >
                    {player.coins}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer stats */}
      {players.length > 0 && (
        <div className="mt-2 pt-2 border-t border-purple-500/30 text-center">
          <span className="text-[10px] text-purple-400">
            {players.length} player{players.length !== 1 ? "s" : ""} in game
          </span>
        </div>
      )}
    </div>
  )
}
