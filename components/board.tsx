"use client"

import type { Player } from "@/lib/types"
import { TILES } from "@/lib/board-tiles"
import { AnimatedPawn } from "@/components/animated-pawn"

interface BoardProps {
  players: Player[]
  currentPlayerId: string
}

// Get tile-specific colors based on effect
function getTileColors(effect: string, coins?: number) {
  switch (effect) {
    case "none":
      return { bg: "from-slate-500/80 to-slate-600/80", border: "border-slate-400/50", icon: "🌀" }
    case "coins":
      return coins && coins > 0
        ? { bg: "from-yellow-400/80 to-amber-500/80", border: "border-yellow-300/50", icon: "💰" }
        : { bg: "from-red-500/80 to-rose-600/80", border: "border-red-400/50", icon: "💸" }
    case "heist_10":
      return { bg: "from-orange-400/80 to-amber-500/80", border: "border-orange-300/50", icon: "🤏" }
    case "heist_100":
      return { bg: "from-orange-500/80 to-red-600/80", border: "border-orange-400/50", icon: "🎭" }
    case "heist_50":
      return { bg: "from-red-600/80 to-rose-700/80", border: "border-red-500/50", icon: "🔫" }
    case "ponzi":
      return { bg: "from-purple-500/80 to-pink-600/80", border: "border-purple-400/50", icon: "🎰" }
    case "police_station":
      return { bg: "from-blue-500/80 to-cyan-600/80", border: "border-blue-400/50", icon: "🚔" }
    default:
      return { bg: "from-slate-500/80 to-slate-600/80", border: "border-slate-400/50", icon: "❓" }
  }
}

export function Board({ players, currentPlayerId }: BoardProps) {
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
    <div className="w-full h-full relative bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 rounded-2xl p-2">
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
        const isCurrentPlayerHere = players.some(
          (p) => p.id === currentPlayerId && p.currentTileId === tile.id
        )
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
            </div>
          </div>
        )
      })}

      {/* Animated Player Pawns */}
      {players.map((player) => (
        <AnimatedPawn
          key={player.id}
          player={player}
          playerIndex={getPlayerIndex(player.id)}
          isCurrentPlayer={player.id === currentPlayerId}
          allPlayers={players}
        />
      ))}
    </div>
  )
}
