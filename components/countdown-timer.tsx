"use client"

import { useEffect, useState } from "react"

interface CountdownTimerProps {
  initialSeconds: number
  onTimeExpired: () => void
  isActive: boolean
}

export function CountdownTimer({ initialSeconds, onTimeExpired, isActive }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(initialSeconds)
      return
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onTimeExpired()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, initialSeconds])

  const percentage = (timeLeft / initialSeconds) * 100
  const isLow = timeLeft <= 5

  return (
    /* Compact timer for side-by-side layout */
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16 rounded-full border-4 border-primary/20 flex items-center justify-center">
        <div
          className={`absolute inset-0 rounded-full transition-all duration-300 ${
            isLow ? "border-4 border-destructive" : "border-4 border-primary"
          }`}
          style={{
            clipPath: `polygon(50% 50%, 50% 0%, ${
              50 + 50 * Math.cos((percentage / 100) * Math.PI * 2 - Math.PI / 2)
            }% ${50 + 50 * Math.sin((percentage / 100) * Math.PI * 2 - Math.PI / 2)}%)`,
          }}
        />
        <span className={`relative text-sm font-bold ${isLow ? "text-destructive" : "text-foreground"}`}>
          {timeLeft}s
        </span>
      </div>
      <p className={`text-xs font-medium ${isLow ? "text-destructive" : "text-muted-foreground"}`}>Time</p>
    </div>
  )
}
