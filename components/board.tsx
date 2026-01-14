"use client"

import { useEffect, useState, useRef } from "react"
import type { Player } from "@/lib/types"
import { TILES, getTileColors, TILES_PER_SIDE } from "@/lib/board-tiles"
import { AnimatedPawn } from "@/components/animated-pawn"

interface BoardProps {
  players: Player[]
  currentPlayerId: string
}

// Board layout constants
const CORNER_SIZE = 12 // % of board for corner tiles
const EDGE_TILES = TILES_PER_SIDE - 1 // 5 regular tiles per side (excluding corner)
const TILE_SIZE = (100 - 2 * CORNER_SIZE) / EDGE_TILES // Size of regular tiles

// Get tile position and dimensions based on its location on the board
function getTileLayout(tileId: number): {
  left: number
  top: number
  width: number
  height: number
  side: "bottom" | "right" | "top" | "left"
  isCorner: boolean
  centerX: number
  centerY: number
} {
  let left = 0, top = 0, width = 0, height = 0
  let side: "bottom" | "right" | "top" | "left" = "bottom"
  let isCorner = false

  // Bottom row (0-5)
  if (tileId >= 0 && tileId <= 5) {
    side = "bottom"
    if (tileId === 0) {
      left = 0
      top = 100 - CORNER_SIZE
      width = CORNER_SIZE
      height = CORNER_SIZE
      isCorner = true
    } else {
      const position = tileId - 1
      left = CORNER_SIZE + position * TILE_SIZE
      top = 100 - CORNER_SIZE
      width = TILE_SIZE
      height = CORNER_SIZE
    }
  }
  // Right column (6-11)
  else if (tileId >= 6 && tileId <= 11) {
    side = "right"
    if (tileId === 6) {
      left = 100 - CORNER_SIZE
      top = 100 - CORNER_SIZE
      width = CORNER_SIZE
      height = CORNER_SIZE
      isCorner = true
    } else {
      const position = tileId - 7
      left = 100 - CORNER_SIZE
      top = 100 - CORNER_SIZE - TILE_SIZE - position * TILE_SIZE
      width = CORNER_SIZE
      height = TILE_SIZE
    }
  }
  // Top row (12-17)
  else if (tileId >= 12 && tileId <= 17) {
    side = "top"
    if (tileId === 12) {
      left = 100 - CORNER_SIZE
      top = 0
      width = CORNER_SIZE
      height = CORNER_SIZE
      isCorner = true
    } else {
      const position = tileId - 13
      left = 100 - CORNER_SIZE - TILE_SIZE - position * TILE_SIZE
      top = 0
      width = TILE_SIZE
      height = CORNER_SIZE
    }
  }
  // Left column (18-23)
  else {
    side = "left"
    if (tileId === 18) {
      left = 0
      top = 0
      width = CORNER_SIZE
      height = CORNER_SIZE
      isCorner = true
    } else {
      const position = tileId - 19
      left = 0
      top = CORNER_SIZE + position * TILE_SIZE
      width = CORNER_SIZE
      height = TILE_SIZE
    }
  }

  return {
    left,
    top,
    width,
    height,
    side,
    isCorner,
    centerX: left + width / 2,
    centerY: top + height / 2,
  }
}

export function Board({ players, currentPlayerId }: BoardProps) {
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 })
  const previousTileRef = useRef<number | null>(null)
  
  const getPlayerIndex = (playerId: string) => {
    return players.findIndex((p) => p.id === playerId)
  }

  // Get ONLY the current player's tile ID for camera (ignores other players completely)
  const myCurrentTileId = players.find(p => p.id === currentPlayerId)?.currentTileId ?? 0
  
  // Calculate camera offset - focus on MY position only
  useEffect(() => {
    const currentLayout = getTileLayout(myCurrentTileId)
    const prevTileId = previousTileRef.current
    
    let focusX: number
    let focusY: number
    
    if (prevTileId !== null && prevTileId !== myCurrentTileId) {
      // Calculate midpoint between my previous and current tile
      const prevLayout = getTileLayout(prevTileId)
      focusX = (prevLayout.centerX + currentLayout.centerX) / 2
      focusY = (prevLayout.centerY + currentLayout.centerY) / 2
    } else {
      // Just focus on my current tile
      focusX = currentLayout.centerX
      focusY = currentLayout.centerY
    }
    
    // Update previous tile reference (only tracks MY movement)
    previousTileRef.current = myCurrentTileId
    
    // Convert focus position to camera offset
    // Player position is in board coordinates (0-100)
    // We need to translate the board to center the player
    // The board is rotated 45deg, so we need to account for that
    
    // Calculate offset needed to center the player
    // Since board is rotated -45deg, X and Y movements are mixed:
    // - Moving right on board = moving diagonally right-down on screen
    // - Moving down on board = moving diagonally left-down on screen
    
    // Convert board coords to what feels like screen offset
    // After -45deg rotation: screenX ≈ boardX - boardY, screenY ≈ boardX + boardY
    const boardOffsetX = 50 - focusX
    const boardOffsetY = 50 - focusY
    
    // Account for rotation: rotate the offset by 45 degrees
    const angle = Math.PI / 4 // 45 degrees
    const rotatedX = boardOffsetX * Math.cos(angle) + boardOffsetY * Math.sin(angle)
    const rotatedY = -boardOffsetX * Math.sin(angle) + boardOffsetY * Math.cos(angle)
    
    // Scale for the viewport (the board is 160vw, so we need proportional movement)
    const rawX = rotatedX * 1.2
    const rawY = rotatedY * 0.6 // Less Y due to perspective squishing
    
    // Clamp to reasonable limits
    const maxOffsetX = 50
    const maxOffsetY = 30
    const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, rawX))
    const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, rawY))
    
    setCameraOffset({ x: clampedX, y: clampedY })
  }, [myCurrentTileId]) // Only depends on MY tile ID - ignores other players

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-200">
      {/* 3D Perspective Container */}
      <div
        className="relative"
        style={{
          perspective: "1000px",
          perspectiveOrigin: "50% 50%",
        }}
      >
        {/* Camera movement wrapper */}
        <div 
          className="transition-transform duration-700 ease-out"
          style={{
            transform: `translateX(${cameraOffset.x}%) translateY(${cameraOffset.y}%)`,
          }}
        >
          {/* Board with 3D tilt - Monopoly GO style isometric view */}
          <div
            className="relative bg-[#1b5e20] rounded-lg"
            style={{
              width: "min(160vw, 140vh)",
              height: "min(160vw, 140vh)",
              transform: "rotateX(55deg) rotateZ(-45deg)",
              transformStyle: "preserve-3d",
              boxShadow: "0 50px 100px rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.3)",
            }}
          >
            {/* Board edge/frame */}
            <div 
              className="absolute inset-0 rounded-lg"
              style={{
                background: "linear-gradient(135deg, #5d4037 0%, #4e342e 50%, #3e2723 100%)",
                transform: "translateZ(-8px)",
                boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
              }}
            />
            
            {/* Main board surface */}
            <div 
              className="absolute inset-0 bg-[#2e7d32] rounded-lg"
              style={{
                boxShadow: "inset 0 0 30px rgba(0,0,0,0.2)",
                overflow: "visible",
              }}
            >
              {/* Inner board area (cream/beige like Monopoly) */}
              <div
                className="absolute overflow-hidden"
                style={{
                  left: `${CORNER_SIZE}%`,
                  top: `${CORNER_SIZE}%`,
                  right: `${CORNER_SIZE}%`,
                  bottom: `${CORNER_SIZE}%`,
                  border: "3px solid #1b5e20",
                  background: "linear-gradient(135deg, #c5e1a5 0%, #a5d6a7 50%, #81c784 100%)",
                }}
              >
                {/* Decorative circular path */}
                <div 
                  className="absolute rounded-full border-4 border-dashed border-[#4e342e]/30"
                  style={{
                    left: "15%",
                    top: "15%",
                    right: "15%",
                    bottom: "15%",
                  }}
                />
                <div 
                  className="absolute rounded-full border-2 border-[#4e342e]/20"
                  style={{
                    left: "25%",
                    top: "25%",
                    right: "25%",
                    bottom: "25%",
                  }}
                />
                
                {/* Corner decorations */}
                <div className="absolute top-4 left-4 text-5xl opacity-70">🏠</div>
                <div className="absolute top-4 right-4 text-5xl opacity-70">🎰</div>
                <div className="absolute bottom-4 left-4 text-5xl opacity-70">💎</div>
                <div className="absolute bottom-4 right-4 text-5xl opacity-70">🏦</div>
                
                {/* Decorative elements around the center */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 text-4xl opacity-60">🌳</div>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-4xl opacity-60">🌳</div>
                <div className="absolute left-10 top-1/2 -translate-y-1/2 text-4xl opacity-60">🌴</div>
                <div className="absolute right-10 top-1/2 -translate-y-1/2 text-4xl opacity-60">🌴</div>
                
                {/* Center piece - main logo area */}
                <div 
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                             bg-white/90 rounded-2xl shadow-xl p-6 border-4 border-[#c62828]"
                  style={{
                    minWidth: "180px",
                  }}
                >
                  {/* Main logo */}
                  <div className="text-center">
                    <h1 className="text-3xl font-black text-[#c62828] tracking-wide drop-shadow-sm">
                      WAY OF
                    </h1>
                    <h1 className="text-4xl font-black text-[#c62828] tracking-widest drop-shadow-sm">
                      LIFE
                    </h1>
                    <div className="flex justify-center gap-1 mt-2">
                      <span className="text-xl">🎲</span>
                      <span className="text-xl">💰</span>
                      <span className="text-xl">🏆</span>
                    </div>
                    <p className="text-[#4e342e] text-xs mt-1 font-bold">Answer. Move. Prosper!</p>
                  </div>
                </div>
                
                {/* Scattered coins decoration */}
                <div className="absolute top-[20%] left-[20%] text-3xl opacity-50 animate-pulse">🪙</div>
                <div className="absolute top-[25%] right-[22%] text-2xl opacity-40">🪙</div>
                <div className="absolute bottom-[22%] left-[25%] text-2xl opacity-45">🪙</div>
                <div className="absolute bottom-[20%] right-[20%] text-3xl opacity-50 animate-pulse">🪙</div>
                
                {/* Small buildings/landmarks */}
                <div className="absolute top-[35%] left-[15%] text-4xl opacity-60">🏪</div>
                <div className="absolute top-[30%] right-[15%] text-4xl opacity-60">🏢</div>
                <div className="absolute bottom-[30%] left-[18%] text-4xl opacity-60">🏨</div>
                <div className="absolute bottom-[35%] right-[18%] text-4xl opacity-60">🏛️</div>
              </div>

              {/* Render all tiles */}
              {TILES.map((tile) => {
                const layout = getTileLayout(tile.id)
                const colors = getTileColors(tile.colorGroup)
                const isCorner = layout.isCorner
                
                return (
                  <div
                    key={tile.id}
                    className="absolute bg-[#e8f5e9] border border-[#1b5e20] flex flex-col overflow-hidden"
                    style={{
                      left: `${layout.left}%`,
                      top: `${layout.top}%`,
                      width: `${layout.width}%`,
                      height: `${layout.height}%`,
                    }}
                  >
                    {/* Color band for non-corner tiles - on outer edge */}
                    {!isCorner && (
                      <div
                        className={`${colors.bg} absolute`}
                        style={{
                          ...(layout.side === "bottom" ? { top: 0, left: 0, right: 0, height: "40%" } : {}),
                          ...(layout.side === "top" ? { bottom: 0, left: 0, right: 0, height: "40%" } : {}),
                          ...(layout.side === "left" ? { right: 0, top: 0, bottom: 0, width: "40%" } : {}),
                          ...(layout.side === "right" ? { left: 0, top: 0, bottom: 0, width: "40%" } : {}),
                        }}
                      />
                    )}
                    
                    {/* Tile content */}
                    <div 
                      className={`
                        flex-1 flex flex-col items-center justify-center p-0.5 relative z-10
                        ${isCorner ? `${colors.bg}` : ""}
                      `}
                    >
                      <span className="text-3xl leading-none drop-shadow">{tile.emoji}</span>
                      <span className="text-[11px] font-black text-[#1a1a1a] leading-tight text-center mt-0.5 drop-shadow-sm">
                        {tile.name}
                      </span>
                      {tile.coins !== 0 && tile.coins !== undefined && (
                        <span className={`text-[10px] font-bold ${tile.coins > 0 ? "text-green-800" : "text-red-700"}`}>
                          {tile.coins > 0 ? "+" : ""}{tile.coins}
                        </span>
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
          </div>
        </div>
      </div>
      
      {/* Minimap in corner */}
      <div 
        className="absolute bottom-4 right-4 w-32 h-32 bg-[#2e7d32] rounded-lg shadow-lg border-2 border-white/50 opacity-80"
        style={{ transform: "rotateX(0deg)" }}
      >
        <div className="relative w-full h-full p-1">
          {/* Simplified minimap tiles */}
          {TILES.map((tile) => {
            const layout = getTileLayout(tile.id)
            const colors = getTileColors(tile.colorGroup)
            const hasPlayer = players.some(p => p.currentTileId === tile.id)
            
            return (
              <div
                key={tile.id}
                className={`absolute ${colors.bg} ${hasPlayer ? 'ring-2 ring-white' : ''}`}
                style={{
                  left: `${layout.left}%`,
                  top: `${layout.top}%`,
                  width: `${layout.width}%`,
                  height: `${layout.height}%`,
                }}
              />
            )
          })}
          {/* Current player indicator on minimap */}
          <div
            className="absolute w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg"
            style={{
              left: `${getTileLayout(myCurrentTileId).centerX}%`,
              top: `${getTileLayout(myCurrentTileId).centerY}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Export layout function for AnimatedPawn
export { getTileLayout, CORNER_SIZE, TILE_SIZE }
