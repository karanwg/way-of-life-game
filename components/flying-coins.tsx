/**
 * FlyingCoins - Animated coin transfer visualization
 * 
 * Shows coins flying from one player's position to another.
 * Used for heist animations and other coin transfers.
 * 
 * NOTE: The board is rotated 55deg on X-axis and -45deg on Z-axis,
 * making screen position calculation complex. We use the minimap
 * positions (bottom-right corner) as a reference since it's not rotated.
 * For simplicity, we animate coins in screen space relative to the
 * leaderboard where player positions are more predictable.
 * 
 * The animation uses:
 * - Staggered coin spawning for visual interest
 * - Arc trajectory (coins go up then down)
 * - Eased timing for natural movement
 */

"use client"

import { useEffect, useState, useRef } from "react"
import type { Player } from "@/lib/types"

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
  const containerRef = useRef<HTMLDivElement>(null)

  // Find player indices for leaderboard-based positioning
  // Players are sorted by coins, so we use their sorted index
  const sortedPlayers = [...players].sort((a, b) => b.coins - a.coins)
  const fromIndex = sortedPlayers.findIndex(p => p.id === fromPlayerId)
  const toIndex = sortedPlayers.findIndex(p => p.id === toPlayerId)

  const fromPlayer = players.find((p) => p.id === fromPlayerId)
  const toPlayer = players.find((p) => p.id === toPlayerId)

  useEffect(() => {
    if (!fromPlayer || !toPlayer) {
      onComplete()
      return
    }

    // Number of coins based on amount (more coins for larger amounts)
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

  // Easing function for smooth animation
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

  // Calculate positions based on leaderboard positions
  // The leaderboard is on the right side (25% width panel)
  // Each player row is roughly 60px tall, starting around 80px from top
  const getLeaderboardY = (index: number) => {
    // Approximate Y position in the right panel
    const baseY = 100 // Header height
    const rowHeight = 60
    return baseY + index * rowHeight + rowHeight / 2
  }

  // X position: coins start from left side of screen, fly to right (leaderboard area)
  // Since the flying coins overlay the board (75% of screen), we position relative to that
  const startX = 40 // Center-ish of the board
  const endX = 85 // Leaderboard area on the right

  const startY = getLeaderboardY(fromIndex >= 0 ? fromIndex : 0) / window.innerHeight * 100
  const endY = getLeaderboardY(toIndex >= 0 ? toIndex : 0) / window.innerHeight * 100

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-visible z-40">
      {coins.map((coin) => {
        const easedProgress = easeOutCubic(coin.progress)
        
        // Arc trajectory - coins go up in the middle then down
        const arcHeight = 15 * (1 - Math.pow(2 * easedProgress - 1, 2))
        
        const x = startX + (endX - startX) * easedProgress
        const y = startY + (endY - startY) * easedProgress - arcHeight
        
        // Scale effect - grow slightly in the middle of the arc
        const scale = 0.8 + 0.4 * Math.sin(easedProgress * Math.PI)
        
        // Fade out near the end
        const opacity = easedProgress < 0.9 ? 1 : 1 - (easedProgress - 0.9) * 10

        return (
          <div
            key={coin.id}
            className="absolute text-2xl drop-shadow-lg"
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
      
      {/* Amount indicator in the middle of the arc */}
      {coins.some((c) => c.progress > 0.3 && c.progress < 0.7) && (
        <div
          className="absolute text-lg font-black text-amber-500 drop-shadow-lg bg-white/80 px-2 py-1 rounded-lg"
          style={{
            left: `${(startX + endX) / 2}%`,
            top: `${Math.min(startY, endY) - 10}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          +{amount} 🪙
        </div>
      )}
    </div>
  )
}
