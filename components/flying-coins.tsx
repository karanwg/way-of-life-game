"use client"

import { useEffect, useState } from "react"
import type { Player } from "@/lib/types"
import { getTileLayout } from "@/components/board"

interface FlyingCoinsProps {
  fromPlayerId: string
  toPlayerId: string
  amount: number
  players: Player[]
  onComplete: () => void
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

    const numCoins = Math.min(Math.max(3, Math.floor(amount / 50)), 8)
    const initialCoins = Array.from({ length: numCoins }, (_, i) => ({
      id: i,
      progress: 0,
    }))
    setCoins(initialCoins)

    const duration = 800
    const staggerDelay = 80
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

  const fromLayout = getTileLayout(fromPlayer.currentTileId)
  const toLayout = getTileLayout(toPlayer.currentTileId)

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-40">
      {coins.map((coin) => {
        const easedProgress = easeOutCubic(coin.progress)
        
        const arcHeight = 8 * (1 - Math.pow(2 * easedProgress - 1, 2))
        const x = fromLayout.centerX + (toLayout.centerX - fromLayout.centerX) * easedProgress
        const y = fromLayout.centerY + (toLayout.centerY - fromLayout.centerY) * easedProgress - arcHeight
        
        const scale = 0.8 + 0.4 * Math.sin(easedProgress * Math.PI)
        const opacity = easedProgress < 0.9 ? 1 : 1 - (easedProgress - 0.9) * 10

        return (
          <div
            key={coin.id}
            className="absolute text-xl"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity,
            }}
          >
            🪙
          </div>
        )
      })}
      
      {coins.some((c) => c.progress > 0.4 && c.progress < 0.8) && (
        <div
          className="absolute text-sm font-bold text-amber-500 drop-shadow-lg"
          style={{
            left: `${(fromLayout.centerX + toLayout.centerX) / 2}%`,
            top: `${(fromLayout.centerY + toLayout.centerY) / 2 - 5}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          +{amount}
        </div>
      )}
    </div>
  )
}
