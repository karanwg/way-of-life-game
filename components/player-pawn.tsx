"use client"

import type { Player } from "@/lib/types"

// Bright, distinct colors for each player
const PAWN_COLORS = [
  { bg: "from-red-400 to-red-600", shadow: "rgba(248, 113, 113, 0.6)", emoji: "🔴" },
  { bg: "from-blue-400 to-blue-600", shadow: "rgba(96, 165, 250, 0.6)", emoji: "🔵" },
  { bg: "from-green-400 to-green-600", shadow: "rgba(74, 222, 128, 0.6)", emoji: "🟢" },
  { bg: "from-yellow-400 to-yellow-600", shadow: "rgba(250, 204, 21, 0.6)", emoji: "🟡" },
  { bg: "from-purple-400 to-purple-600", shadow: "rgba(192, 132, 252, 0.6)", emoji: "🟣" },
  { bg: "from-pink-400 to-pink-600", shadow: "rgba(244, 114, 182, 0.6)", emoji: "🩷" },
  { bg: "from-orange-400 to-orange-600", shadow: "rgba(251, 146, 60, 0.6)", emoji: "🟠" },
  { bg: "from-cyan-400 to-cyan-600", shadow: "rgba(34, 211, 238, 0.6)", emoji: "🩵" },
]

interface PlayerPawnProps {
  player: Player
  playerIndex: number
  isCurrentPlayer: boolean
  isMoving?: boolean
  size?: "sm" | "md" | "lg"
}

export function PlayerPawn({ player, playerIndex, isCurrentPlayer, isMoving, size = "md" }: PlayerPawnProps) {
  const colorIndex = playerIndex % PAWN_COLORS.length
  const color = PAWN_COLORS[colorIndex]

  const sizeClasses = {
    sm: "w-6 h-8",
    md: "w-8 h-10",
    lg: "w-10 h-12",
  }

  return (
    <div
      className={`
        relative flex flex-col items-center
        ${isMoving ? "animate-pawn-hop" : ""}
        ${isCurrentPlayer ? "z-10" : "z-0"}
      `}
      title={player.name}
    >
      {/* Pawn body - chess piece style */}
      <div
        className={`
          ${sizeClasses[size]}
          relative flex items-end justify-center
        `}
      >
        {/* Pawn head */}
        <div
          className={`
            absolute top-0 w-4 h-4 rounded-full
            bg-gradient-to-br ${color.bg}
            ${isCurrentPlayer ? "ring-2 ring-white ring-offset-1 ring-offset-transparent" : ""}
          `}
          style={{
            boxShadow: isCurrentPlayer ? `0 0 12px ${color.shadow}` : `0 2px 4px rgba(0,0,0,0.3)`,
          }}
        />

        {/* Pawn neck */}
        <div
          className={`
            absolute top-3.5 w-2 h-2
            bg-gradient-to-br ${color.bg}
          `}
        />

        {/* Pawn body cone */}
        <div
          className={`
            w-5 h-5 rounded-b-full
            bg-gradient-to-br ${color.bg}
          `}
          style={{
            clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
            boxShadow: `0 2px 6px rgba(0,0,0,0.4)`,
          }}
        />

        {/* Pawn base */}
        <div
          className={`
            absolute -bottom-0.5 w-6 h-1.5 rounded-full
            bg-gradient-to-br ${color.bg}
          `}
          style={{
            boxShadow: `0 2px 4px rgba(0,0,0,0.3)`,
          }}
        />
      </div>

      {/* Player name label */}
      <div
        className={`
          mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold
          bg-black/60 text-white whitespace-nowrap
          max-w-[50px] truncate
          ${isCurrentPlayer ? "ring-1 ring-accent" : ""}
        `}
      >
        {player.name}
      </div>
    </div>
  )
}

export function getPawnColor(playerIndex: number) {
  return PAWN_COLORS[playerIndex % PAWN_COLORS.length]
}
