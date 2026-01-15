/**
 * Leaderboard - Real-time player rankings display
 * 
 * Shows all players sorted by coin count (descending).
 * Updates automatically as player state changes.
 * 
 * Players who disconnect are automatically removed from the list
 * via the game engine's removePlayer method.
 * 
 * Features:
 * - Medal emojis for top 3 positions
 * - Player pawn color indicator
 * - Coin count with visual styling for positive/negative
 * - Scrollable list for many players
 */

"use client"

import type { Player } from "@/lib/types"
import { getPawnColor } from "./player-pawn"

interface LeaderboardProps {
  players: Player[]
}

/** Get medal emoji for top positions */
function getMedalEmoji(index: number): string | null {
  switch (index) {
    case 0: return "🥇"
    case 1: return "🥈"
    case 2: return "🥉"
    default: return null
  }
}

export function Leaderboard({ players }: LeaderboardProps) {
  // Players are already sorted by coins (descending) from the game engine
  
  return (
    <div className="bg-[#FAF8F0] border-4 border-amber-700/80 rounded-2xl h-full flex flex-col shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3">
        <h2 className="font-bold text-white text-sm flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span>Leaderboard</span>
        </h2>
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-4">
            <span className="text-3xl mb-2">👀</span>
            <p className="text-xs text-amber-700">Waiting for players...</p>
          </div>
        ) : (
          players.map((player, index) => {
            const pawnColor = getPawnColor(index)
            const medal = getMedalEmoji(index)

            return (
              <div
                key={player.id}
                className={`
                  flex items-center gap-2 p-2.5 rounded-xl border-2
                  transition-all duration-300
                  ${index === 0 
                    ? "bg-amber-50 border-amber-400" 
                    : "bg-white border-amber-100"}
                `}
              >
                {/* Rank indicator */}
                <div className="flex-shrink-0 w-6 text-center">
                  {medal ? (
                    <span className="text-sm">{medal}</span>
                  ) : (
                    <span className="text-xs text-amber-600 font-bold">#{index + 1}</span>
                  )}
                </div>

                {/* Player color indicator */}
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${pawnColor.bg} border-2 border-white shadow-sm`}
                />

                {/* Player name */}
                <span className="text-xs font-bold text-gray-800 truncate flex-1">
                  {player.name}
                </span>

                {/* Coin count */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-sm">🪙</span>
                  <span className={`text-xs font-bold ${player.coins >= 0 ? "text-amber-700" : "text-red-600"}`}>
                    {player.coins}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer - player count */}
      {players.length > 0 && (
        <div className="px-4 py-2 border-t-2 border-amber-200 bg-amber-50">
          <span className="text-[10px] text-amber-700 font-medium">
            {players.length} player{players.length !== 1 ? "s" : ""} in game
          </span>
        </div>
      )}
    </div>
  )
}
