"use client"

import { useEffect, useState, useRef } from "react"
import type { Player } from "@/lib/types"
import { PlayerPawn } from "@/components/player-pawn"
import { TILES } from "@/lib/board-tiles"

interface AnimatedPawnProps {
  player: Player
  playerIndex: number
  isCurrentPlayer: boolean
  onAnimationComplete?: () => void
}

// Calculate elliptical positions for 12 tiles (same as Board)
function getTilePosition(index: number) {
  const angle = (index / 12) * 2 * Math.PI - Math.PI / 2
  const radiusX = 38
  const radiusY = 32
  const x = 50 + radiusX * Math.cos(angle)
  const y = 50 + radiusY * Math.sin(angle)
  return { x, y }
}

export function AnimatedPawn({
  player,
  playerIndex,
  isCurrentPlayer,
  onAnimationComplete,
}: AnimatedPawnProps) {
  const [displayTileId, setDisplayTileId] = useState(player.currentTileId)
  const [isHopping, setIsHopping] = useState(false)
  const previousTileRef = useRef(player.currentTileId)
  const animationInProgressRef = useRef(false)

  useEffect(() => {
    const previousTile = previousTileRef.current
    const targetTile = player.currentTileId

    // If position hasn't changed or animation already in progress, skip
    if (previousTile === targetTile || animationInProgressRef.current) {
      return
    }

    animationInProgressRef.current = true

    // Calculate the path from previous to target (going forward on the board)
    const totalTiles = TILES.length
    let tilesToVisit: number[] = []

    if (targetTile > previousTile) {
      // Simple forward movement
      for (let i = previousTile + 1; i <= targetTile; i++) {
        tilesToVisit.push(i)
      }
    } else {
      // Wrapped around the board (e.g., from tile 10 to tile 2)
      for (let i = previousTile + 1; i < totalTiles; i++) {
        tilesToVisit.push(i)
      }
      for (let i = 0; i <= targetTile; i++) {
        tilesToVisit.push(i)
      }
    }

    // Animate through each tile
    const HOP_DURATION = 350 // Duration of hop animation
    const PAUSE_BETWEEN_HOPS = 80 // Pause between hops

    const animateStep = (index: number) => {
      if (index >= tilesToVisit.length) {
        // Animation complete
        setIsHopping(false)
        animationInProgressRef.current = false
        previousTileRef.current = targetTile
        onAnimationComplete?.()
        return
      }

      setIsHopping(true)
      setDisplayTileId(tilesToVisit[index])

      // After hop animation, move to next tile
      setTimeout(() => {
        setIsHopping(false)
        setTimeout(() => {
          animateStep(index + 1)
        }, PAUSE_BETWEEN_HOPS)
      }, HOP_DURATION)
    }

    // Start animation after a brief delay
    setTimeout(() => {
      animateStep(0)
    }, 100)
  }, [player.currentTileId, onAnimationComplete])

  const pos = getTilePosition(displayTileId)

  return (
    <div
      className={`
        absolute transform -translate-x-1/2 z-30
        ${isHopping ? "animate-pawn-hop" : ""}
      `}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y + 8}%`, // Offset below the tile
        transition: isHopping ? "left 0.25s ease-out, top 0.25s ease-out" : "none",
      }}
    >
      <PlayerPawn
        player={player}
        playerIndex={playerIndex}
        isCurrentPlayer={isCurrentPlayer}
        isMoving={isHopping}
        size="sm"
      />
    </div>
  )
}
