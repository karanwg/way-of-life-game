/**
 * AnimatedPawn - Animated player token on the game board
 * 
 * This component handles smooth movement animation when a player
 * moves between tiles. It animates through each intermediate tile
 * with a hopping motion.
 * 
 * ANIMATION FLOW:
 * 1. Detect when player.currentTileId changes
 * 2. Wait for DEFAULT_START_DELAY (synced with dice animation)
 * 3. Hop through each tile between previous and target positions
 * 4. Each hop takes HOP_DURATION ms with PAUSE_BETWEEN_HOPS between
 * 
 * The pawn is counter-rotated to appear upright on the tilted board.
 * Multiple players on the same tile are spread out horizontally.
 */

"use client"

import { useEffect, useState, useRef } from "react"
import type { Player } from "@/lib/types"
import { PlayerPawn } from "@/components/player-pawn"
import { TOTAL_TILES } from "@/lib/board-tiles"
import { getTileLayout } from "@/components/board"

interface AnimatedPawnProps {
  player: Player
  playerIndex: number
  isCurrentPlayer: boolean
  allPlayers: Player[]
  onAnimationComplete?: () => void
}

/** Get pawn center position for a tile in board coordinates (0-100%) */
function getPawnPosition(tileId: number): { x: number; y: number } {
  const layout = getTileLayout(tileId)
  return {
    x: layout.centerX,
    y: layout.centerY,
  }
}

/** Calculate horizontal offset when multiple players share a tile */
function getPlayerOffset(
  playerId: string,
  tileId: number,
  allPlayers: Player[]
): { xOffset: number; yOffset: number } {
  // Filter to players on this tile
  const playersOnTile = allPlayers.filter((p) => p.currentTileId === tileId)
  
  if (playersOnTile.length <= 1) {
    return { xOffset: 0, yOffset: 0 }
  }
  
  // Find this player's index among players on the tile
  const indexOnTile = playersOnTile.findIndex((p) => p.id === playerId)
  
  // Spread players horizontally with spacing
  const spacing = 2 // % of board width
  const totalWidth = (playersOnTile.length - 1) * spacing
  const startOffset = -totalWidth / 2
  
  return {
    xOffset: startOffset + indexOnTile * spacing,
    yOffset: 0,
  }
}

// Animation timing constants
const DEFAULT_START_DELAY = 1900 // Wait for dice animation to complete
const HOP_DURATION = 375 // Duration of each hop (1.5x slower)
const PAUSE_BETWEEN_HOPS = 75 // Pause between hops (1.5x slower)

export function AnimatedPawn({
  player,
  playerIndex,
  isCurrentPlayer,
  allPlayers,
  onAnimationComplete,
}: AnimatedPawnProps) {
  // Display tile might differ from actual tile during animation
  const [displayTileId, setDisplayTileId] = useState(player.currentTileId)
  const [isHopping, setIsHopping] = useState(false)
  
  // Track previous tile for animation path calculation
  const previousTileRef = useRef(player.currentTileId)
  // Prevent overlapping animations
  const animationInProgressRef = useRef(false)

  useEffect(() => {
    const previousTile = previousTileRef.current
    const targetTile = player.currentTileId

    // No animation needed if already at target or animation in progress
    if (previousTile === targetTile || animationInProgressRef.current) {
      return
    }

    animationInProgressRef.current = true

    // Calculate tiles to visit (handling wrap-around)
    const tilesToVisit: number[] = []
    
    if (targetTile > previousTile) {
      // Simple forward movement
      for (let i = previousTile + 1; i <= targetTile; i++) {
        tilesToVisit.push(i)
      }
    } else {
      // Wrap around through tile 0
      for (let i = previousTile + 1; i < TOTAL_TILES; i++) {
        tilesToVisit.push(i)
      }
      for (let i = 0; i <= targetTile; i++) {
        tilesToVisit.push(i)
      }
    }

    // Recursive animation step function
    const animateStep = (index: number) => {
      if (index >= tilesToVisit.length) {
        // Animation complete
        setIsHopping(false)
        animationInProgressRef.current = false
        previousTileRef.current = targetTile
        onAnimationComplete?.()
        return
      }

      // Start hop to next tile
      setIsHopping(true)
      setDisplayTileId(tilesToVisit[index])

      // After hop duration, pause then continue to next tile
      setTimeout(() => {
        setIsHopping(false)
        setTimeout(() => {
          animateStep(index + 1)
        }, PAUSE_BETWEEN_HOPS)
      }, HOP_DURATION)
    }

    // Start animation after delay (to sync with dice animation)
    setTimeout(() => {
      animateStep(0)
    }, DEFAULT_START_DELAY)
  }, [player.currentTileId, onAnimationComplete])

  // Calculate current display position
  const pos = getPawnPosition(displayTileId)
  
  // Only apply offset when not hopping (prevents jittering)
  const offset = isHopping 
    ? { xOffset: 0, yOffset: 0 }
    : getPlayerOffset(player.id, displayTileId, allPlayers)

  return (
    <div
      className="absolute z-30"
      style={{
        left: `${pos.x + offset.xOffset}%`,
        top: `${pos.y + offset.yOffset}%`,
        // Counter-rotate to stand upright on the tilted board
        // Board has: rotateX(55deg) rotateZ(-45deg)
        // We apply: rotateZ(45deg) to align vertically
        //           rotateX(-55deg) to stand perpendicular to view
        //           scaleY(3) to compensate for perspective squishing
        transform: `
          translate(-50%, -100%)
          rotateZ(45deg)
          rotateX(-55deg)
          scaleY(3)
        `,
        transformStyle: "preserve-3d",
        transition: isHopping 
          ? "left 0.225s ease-out, top 0.225s ease-out" 
          : "left 0.45s ease-out, top 0.45s ease-out",
      }}
    >
      <PlayerPawn
        player={player}
        playerIndex={playerIndex}
        isCurrentPlayer={isCurrentPlayer}
        isMoving={isHopping}
        size="lg"
      />
    </div>
  )
}
