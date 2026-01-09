"use client"

import { useEffect, useState, useRef } from "react"

interface CountdownTimerProps {
  initialSeconds: number
  onTimeExpired: () => void
  isActive: boolean
}

export function CountdownTimer({ initialSeconds, onTimeExpired, isActive }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)
  const onTimeExpiredRef = useRef(onTimeExpired)

  // Keep callback ref updated
  useEffect(() => {
    onTimeExpiredRef.current = onTimeExpired
  }, [onTimeExpired])

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(initialSeconds)
      return
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          // Use setTimeout to avoid state update during render
          setTimeout(() => onTimeExpiredRef.current(), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, initialSeconds])

  const percentage = (timeLeft / initialSeconds) * 100
  const isLow = timeLeft <= 5

  const radius = 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Background circle */}
        <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(139, 92, 246, 0.2)" strokeWidth="4" />
          {/* Animated progress circle */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={isLow ? "#ef4444" : "#8b5cf6"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        {/* Timer text */}
        <span className={`relative text-lg font-bold ${isLow ? "text-red-500 animate-pulse" : "text-white"}`}>
          {timeLeft}s
        </span>
      </div>
      <p className={`text-xs font-medium ${isLow ? "text-red-400" : "text-purple-300"}`}>Time</p>
    </div>
  )
}
