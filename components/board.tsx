"use client"

import type { Player } from "@/lib/types"
import { TILES } from "@/lib/board-tiles"

interface BoardProps {
  players: Player[]
  currentPlayerId: string
}

export function Board({ players, currentPlayerId }: BoardProps) {
  const getPlayersOnTile = (tileId: number): Player[] => {
    return players.filter((p) => p.currentTileId === tileId)
  }

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
      <h2 className="text-lg font-bold text-foreground mb-6">Way of Life Board</h2>

      {/* 12-Tile Board in a 4x3 Grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {TILES.map((tile) => {
          const playersHere = getPlayersOnTile(tile.id)
          const isCurrentPlayer = playersHere.some((p) => p.id === currentPlayerId)

          return (
            <div
              key={tile.id}
              className={`relative aspect-square rounded-lg border-2 p-3 flex flex-col items-center justify-center transition-all ${
                isCurrentPlayer
                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 ring-2 ring-yellow-400"
                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-primary/50"
              }`}
            >
              {/* Tile Content */}
              <div className="text-center text-xs leading-tight mb-2">
                <p className="font-bold text-foreground truncate">{tile.name}</p>
                <p className="text-xs text-muted-foreground">{tile.effect !== "none" ? `[${tile.effect}]` : ""}</p>
              </div>

              {/* Player Tokens */}
              {playersHere.length > 0 && (
                <div className="absolute bottom-1 flex gap-1 flex-wrap justify-center">
                  {playersHere.slice(0, 3).map((player) => (
                    <div
                      key={player.id}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        isCurrentPlayer ? "bg-yellow-600" : "bg-primary"
                      }`}
                      title={player.name}
                    >
                      {player.name.charAt(0)}
                    </div>
                  ))}
                  {playersHere.length > 3 && (
                    <div className="text-xs font-bold text-muted-foreground">+{playersHere.length - 3}</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Board Stats */}
      <div className="bg-slate-100 dark:bg-slate-700/50 rounded p-3 text-xs">
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Current Tile:</span>{" "}
          {TILES[players.find((p) => p.id === currentPlayerId)?.currentTileId || 0]?.name}
        </p>
      </div>
    </div>
  )
}
