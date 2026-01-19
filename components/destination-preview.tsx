/**
 * DestinationPreview - Ethereal floating card showing where you're about to land
 * 
 * Appears after dice roll to give the player time to read their destination
 * while the pawn is moving. Has a shining, floating, ethereal appearance.
 */

"use client"

import { TILES } from "@/lib/board-tiles"

interface DestinationPreviewProps {
  tileId: number
  isVisible: boolean
}

export function DestinationPreview({ tileId, isVisible }: DestinationPreviewProps) {
  const tile = TILES[tileId]
  
  if (!tile) return null

  return (
    <div 
      className={`
        transition-all duration-500 ease-out
        ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"}
      `}
    >
      {/* Outer glow */}
      <div className="absolute inset-0 -m-2 bg-gradient-to-b from-amber-200/40 to-transparent rounded-3xl blur-xl animate-pulse" />
      
      {/* Card container */}
      <div 
        className="
          relative px-6 py-4 rounded-2xl
          bg-gradient-to-b from-white/95 to-amber-50/95
          border-2 border-amber-300/60
          shadow-[0_0_30px_rgba(251,191,36,0.4),0_0_60px_rgba(251,191,36,0.2)]
          backdrop-blur-sm
          animate-float
        "
      >
        {/* Shimmer effect */}
        <div 
          className="
            absolute inset-0 rounded-2xl overflow-hidden pointer-events-none
          "
        >
          <div 
            className="
              absolute inset-0 
              bg-gradient-to-r from-transparent via-white/40 to-transparent
              -translate-x-full animate-shimmer
            "
          />
        </div>

        {/* Content */}
        <div className="relative flex items-center gap-4">
          {/* Emoji with glow */}
          <div className="relative">
            <div className="absolute inset-0 text-5xl blur-sm opacity-50">{tile.emoji}</div>
            <div className="text-5xl relative">{tile.emoji}</div>
          </div>
          
          {/* Text content */}
          <div className="flex flex-col">
            <span className="text-xs font-medium text-amber-600/80 uppercase tracking-wider">
              Landing on...
            </span>
            <span className="text-xl font-black text-gray-800">
              {tile.name}
            </span>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
      </div>
    </div>
  )
}
