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

  const sizeConfig = {
    sm: { container: "w-6 h-8", head: "w-3 h-3", neck: "w-1.5 h-1.5 top-2.5", body: "w-4 h-4", base: "w-5 h-1", label: "text-[6px] px-1 max-w-[40px]" },
    md: { container: "w-8 h-10", head: "w-4 h-4", neck: "w-2 h-2 top-3.5", body: "w-5 h-5", base: "w-6 h-1.5", label: "text-[8px] px-1.5 max-w-[50px]" },
    lg: { container: "w-12 h-14", head: "w-5 h-5", neck: "w-2.5 h-2.5 top-4", body: "w-7 h-7", base: "w-8 h-2", label: "text-[10px] px-2 max-w-[70px]" },
  }
  
  const cfg = sizeConfig[size]

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
          ${cfg.container}
          relative flex items-end justify-center
        `}
      >
        {/* Pawn head */}
        <div
          className={`
            absolute top-0 ${cfg.head} rounded-full
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
            absolute ${cfg.neck}
            bg-gradient-to-br ${color.bg}
          `}
        />

        {/* Pawn body cone */}
        <div
          className={`
            ${cfg.body} rounded-b-full
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
            absolute -bottom-0.5 ${cfg.base} rounded-full
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
          mt-1 py-0.5 rounded-md font-bold
          bg-white text-gray-800 whitespace-nowrap shadow-md border border-gray-300
          truncate ${cfg.label}
          ${isCurrentPlayer ? "ring-2 ring-amber-400" : ""}
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
