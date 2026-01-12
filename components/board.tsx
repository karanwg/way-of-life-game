"use client"

import type { Player } from "@/lib/types"
import { TILES } from "@/lib/board-tiles"
import { PlayerPawn } from "@/components/player-pawn"

interface BoardProps {
  players: Player[]
  currentPlayerId: string
}

// Get tile-specific colors based on effect
function getTileColors(effect: string, coins?: number) {
  switch (effect) {
    case "none":
      return coins === 0
        ? { bg: "from-slate-500/80 to-slate-600/80", border: "border-slate-400/50", icon: "🌀" }
        : { bg: "from-emerald-500/80 to-emerald-600/80", border: "border-emerald-400/50", icon: "🎁" }
    case "coins":
      return coins && coins > 0
        ? { bg: "from-yellow-400/80 to-amber-500/80", border: "border-yellow-300/50", icon: "💰" }
        : { bg: "from-red-500/80 to-rose-600/80", border: "border-red-400/50", icon: "💸" }
    case "teleport":
      return { bg: "from-purple-500/80 to-violet-600/80", border: "border-purple-400/50", icon: "🌀" }
    case "teleport_random":
      return { bg: "from-indigo-500/80 to-purple-600/80", border: "border-indigo-400/50", icon: "🎲" }
    case "move_and_coins":
      return { bg: "from-orange-500/80 to-red-600/80", border: "border-orange-400/50", icon: "👟" }
    case "coins_global":
      return coins && coins < 0
        ? { bg: "from-pink-500/80 to-rose-600/80", border: "border-pink-400/50", icon: "💔" }
        : { bg: "from-pink-400/80 to-fuchsia-500/80", border: "border-pink-300/50", icon: "💍" }
    case "debuff_skip_next":
      return { bg: "from-gray-600/80 to-slate-700/80", border: "border-gray-500/50", icon: "⛓️" }
    case "next_die_cap":
      return { bg: "from-cyan-500/80 to-teal-600/80", border: "border-cyan-400/50", icon: "📋" }
    default:
      return { bg: "from-slate-500/80 to-slate-600/80", border: "border-slate-400/50", icon: "❓" }
  }
}

export function Board({ players, currentPlayerId }: BoardProps) {
  const getPlayersOnTile = (tileId: number): Player[] => {
    return players.filter((p) => p.currentTileId === tileId)
  }

  // Calculate elliptical positions for 12 tiles
  const getTilePosition = (index: number) => {
    const angle = (index / 12) * 2 * Math.PI - Math.PI / 2 // Start from top
    const radiusX = 38
    const radiusY = 32
    const x = 50 + radiusX * Math.cos(angle)
    const y = 50 + radiusY * Math.sin(angle)
    return { x, y }
  }

  // Find player index for consistent coloring
  const getPlayerIndex = (playerId: string) => {
    return players.findIndex((p) => p.id === playerId)
  }

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 rounded-2xl overflow-hidden p-2">
      {/* Starfield background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Center decoration - Game title */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0">
        <div className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
          WAY OF
        </div>
        <div className="text-3xl font-black bg-gradient-to-r from-cyan-400 via-purple-500 to-yellow-400 bg-clip-text text-transparent">
          LIFE
        </div>
        <div className="text-xs text-muted-foreground mt-1">12 Tiles of Chaos</div>
      </div>

      {/* Connecting path (ellipse) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <ellipse
          cx="50"
          cy="50"
          rx="38"
          ry="32"
          fill="none"
          stroke="url(#pathGradient)"
          strokeWidth="0.8"
          strokeDasharray="2 1"
          opacity="0.5"
        />
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ecdc4" />
            <stop offset="50%" stopColor="#ffd93d" />
            <stop offset="100%" stopColor="#ff6b6b" />
          </linearGradient>
        </defs>
      </svg>

      {/* Tiles */}
      {TILES.map((tile, index) => {
        const pos = getTilePosition(index)
        const playersHere = getPlayersOnTile(tile.id)
        const isCurrentPlayerHere = playersHere.some((p) => p.id === currentPlayerId)
        const colors = getTileColors(tile.effect, tile.coins)

        return (
          <div
            key={tile.id}
            className={`
              absolute transform -translate-x-1/2 -translate-y-1/2
              transition-all duration-300
              ${isCurrentPlayerHere ? "scale-110 z-20" : "z-10 hover:scale-105"}
            `}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: "16%",
              minWidth: "80px",
              maxWidth: "120px",
            }}
          >
            {/* Tile card */}
            <div
              className={`
                relative rounded-xl border-2 ${colors.border}
                bg-gradient-to-br ${colors.bg}
                backdrop-blur-sm
                p-2
                shadow-lg
                ${isCurrentPlayerHere ? "ring-2 ring-accent ring-offset-2 ring-offset-transparent animate-pulse-glow" : ""}
              `}
            >
              {/* Tile number badge */}
              <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-xs font-bold text-white border border-white/30">
                {index}
              </div>

              {/* Tile icon */}
              <div className="text-center text-xl mb-1">{colors.icon}</div>

              {/* Tile name */}
              <div className="text-xs font-bold text-white text-center leading-tight line-clamp-2 min-h-[28px]">
                {tile.name}
              </div>

              {/* Coins indicator */}
              {tile.coins !== 0 && tile.coins !== undefined && (
                <div
                  className={`
                  text-sm font-bold text-center mt-1
                  ${tile.coins > 0 ? "text-yellow-300" : "text-red-300"}
                `}
                >
                  {tile.coins > 0 ? "+" : ""}
                  {tile.coins}
                </div>
              )}

              {/* Player pawns on this tile */}
              {playersHere.length > 0 && (
                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {playersHere.slice(0, 4).map((player) => (
                    <PlayerPawn
                      key={player.id}
                      player={player}
                      playerIndex={getPlayerIndex(player.id)}
                      isCurrentPlayer={player.id === currentPlayerId}
                      size="sm"
                    />
                  ))}
                  {playersHere.length > 4 && (
                    <div className="text-xs font-bold text-white bg-black/60 px-1 rounded">
                      +{playersHere.length - 4}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
