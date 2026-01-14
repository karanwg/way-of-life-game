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

// Get pawn center position for a tile
function getPawnPosition(tileId: number): { x: number; y: number } {
  const layout = getTileLayout(tileId)
  return {
    x: layout.centerX,
    y: layout.centerY,
  }
}

// Calculate offset for players on the same tile
function getPlayerOffset(
  playerId: string,
  tileId: number,
  allPlayers: Player[]
): { xOffset: number; yOffset: number } {
  const playersOnTile = allPlayers.filter((p) => p.currentTileId === tileId)
  
  if (playersOnTile.length <= 1) return { xOffset: 0, yOffset: 0 }
  
  const indexOnTile = playersOnTile.findIndex((p) => p.id === playerId)
  const spacing = 2
  const totalWidth = (playersOnTile.length - 1) * spacing
  const startOffset = -totalWidth / 2
  
  return {
    xOffset: startOffset + indexOnTile * spacing,
    yOffset: 0,
  }
}

// Delay before pawn starts hopping
const DEFAULT_START_DELAY = 1900

export function AnimatedPawn({
  player,
  playerIndex,
  isCurrentPlayer,
  allPlayers,
  onAnimationComplete,
}: AnimatedPawnProps) {
  const [displayTileId, setDisplayTileId] = useState(player.currentTileId)
  const [isHopping, setIsHopping] = useState(false)
  const previousTileRef = useRef(player.currentTileId)
  const animationInProgressRef = useRef(false)

  useEffect(() => {
    const previousTile = previousTileRef.current
    const targetTile = player.currentTileId

    if (previousTile === targetTile || animationInProgressRef.current) {
      return
    }

    animationInProgressRef.current = true

    const totalTiles = TOTAL_TILES
    let tilesToVisit: number[] = []

    if (targetTile > previousTile) {
      for (let i = previousTile + 1; i <= targetTile; i++) {
        tilesToVisit.push(i)
      }
    } else {
      for (let i = previousTile + 1; i < totalTiles; i++) {
        tilesToVisit.push(i)
      }
      for (let i = 0; i <= targetTile; i++) {
        tilesToVisit.push(i)
      }
    }

    const HOP_DURATION = 250
    const PAUSE_BETWEEN_HOPS = 50

    const animateStep = (index: number) => {
      if (index >= tilesToVisit.length) {
        setIsHopping(false)
        animationInProgressRef.current = false
        previousTileRef.current = targetTile
        onAnimationComplete?.()
        return
      }

      setIsHopping(true)
      setDisplayTileId(tilesToVisit[index])

      setTimeout(() => {
        setIsHopping(false)
        setTimeout(() => {
          animateStep(index + 1)
        }, PAUSE_BETWEEN_HOPS)
      }, HOP_DURATION)
    }

    setTimeout(() => {
      animateStep(0)
    }, DEFAULT_START_DELAY)
  }, [player.currentTileId, onAnimationComplete])

  const pos = getPawnPosition(displayTileId)
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
        // Board has rotateX(55deg) rotateZ(-45deg)
        // We counter with rotateZ(45deg) to align vertically
        // Then rotateX(-55deg) to stand perpendicular to view
        // Scale Y to compensate for perspective squishing and make taller
        transform: `
          translate(-50%, -100%)
          rotateZ(45deg)
          rotateX(-55deg)
          scaleY(3)
        `,
        transformStyle: "preserve-3d",
        transition: isHopping 
          ? "left 0.15s ease-out, top 0.15s ease-out" 
          : "left 0.3s ease-out, top 0.3s ease-out",
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
