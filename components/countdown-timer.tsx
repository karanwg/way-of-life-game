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
    <div className="relative w-16 h-16 flex items-center justify-center bg-white rounded-full border-2 border-amber-200 shadow-sm">
      {/* Background ring */}
      <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#fef3c7" strokeWidth="4" />
        {/* Progress ring */}
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={isLow ? "#ef4444" : "#22c55e"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      
      {/* Timer text */}
      <span className={`relative text-xl font-black ${isLow ? "text-red-500 animate-pulse" : "text-green-600"}`}>
        {timeLeft}
      </span>
    </div>
  )
}
