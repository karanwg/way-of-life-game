"use client"

import { useEffect, useState } from "react"
import type { Player } from "@/lib/types"

interface FlyingCoinsProps {
  fromPlayerId: string
  toPlayerId: string
  amount: number
  players: Player[]
  onComplete: () => void
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

export function FlyingCoins({
  fromPlayerId,
  toPlayerId,
  amount,
  players,
  onComplete,
}: FlyingCoinsProps) {
  const [coins, setCoins] = useState<{ id: number; progress: number }[]>([])
  const [isComplete, setIsComplete] = useState(false)

  const fromPlayer = players.find((p) => p.id === fromPlayerId)
  const toPlayer = players.find((p) => p.id === toPlayerId)

  useEffect(() => {
    if (!fromPlayer || !toPlayer) {
      onComplete()
      return
    }

    // Create coins with staggered start times
    const numCoins = Math.min(Math.max(3, Math.floor(amount / 50)), 8)
    const initialCoins = Array.from({ length: numCoins }, (_, i) => ({
      id: i,
      progress: 0,
    }))
    setCoins(initialCoins)

    // Animate coins
    const duration = 800 // ms
    const staggerDelay = 80 // ms between each coin
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime

      setCoins((prev) =>
        prev.map((coin) => {
          const coinStartTime = coin.id * staggerDelay
          const coinElapsed = Math.max(0, elapsed - coinStartTime)
          const progress = Math.min(1, coinElapsed / duration)
          return { ...coin, progress }
        })
      )

      const totalDuration = duration + (numCoins - 1) * staggerDelay
      if (elapsed < totalDuration) {
        requestAnimationFrame(animate)
      } else {
        setIsComplete(true)
        setTimeout(onComplete, 200)
      }
    }

    requestAnimationFrame(animate)
  }, [fromPlayer, toPlayer, amount, onComplete])

  if (!fromPlayer || !toPlayer || isComplete) return null

  const fromPos = getTilePosition(fromPlayer.currentTileId)
  const toPos = getTilePosition(toPlayer.currentTileId)

  // Add offset for pawn position (below tile)
  const fromY = fromPos.y + 8
  const toY = toPos.y + 8

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {coins.map((coin) => {
        // Easing function for smooth arc
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
        const easedProgress = easeOutCubic(coin.progress)

        // Calculate current position with arc
        const currentX = fromPos.x + (toPos.x - fromPos.x) * easedProgress
        const currentY = fromY + (toY - fromY) * easedProgress

        // Add arc (parabola) - coins fly up then down
        const arcHeight = 15 // percentage points
        const arc = -4 * arcHeight * easedProgress * (easedProgress - 1)

        // Scale and opacity based on progress
        const scale = 1 + Math.sin(easedProgress * Math.PI) * 0.3
        const opacity = coin.progress < 0.1 ? coin.progress * 10 : coin.progress > 0.9 ? (1 - coin.progress) * 10 : 1

        return (
          <div
            key={coin.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${currentX}%`,
              top: `${currentY - arc}%`,
              opacity,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${easedProgress * 360}deg)`,
              transition: "none",
            }}
          >
            <div className="text-2xl drop-shadow-lg">🪙</div>
          </div>
        )
      })}

      {/* Amount indicator that follows the coins */}
      {coins.length > 0 && coins[Math.floor(coins.length / 2)].progress > 0.3 && (
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 animate-bounce-in"
          style={{
            left: `${(fromPos.x + toPos.x) / 2}%`,
            top: `${(fromY + toY) / 2 - 12}%`,
          }}
        >
          <div className="bg-yellow-500/90 text-black font-black text-sm px-2 py-1 rounded-full shadow-lg">
            +{amount}
          </div>
        </div>
      )}
    </div>
  )
}
