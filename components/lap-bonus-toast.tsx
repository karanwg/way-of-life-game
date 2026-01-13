"use client"

import { useEffect, useState } from "react"
import { playChaChingSound } from "@/lib/sounds"

export interface LapBonusData {
  lapsCompleted: number
  coinsAwarded: number
}

interface LapBonusToastProps {
  data: LapBonusData | null
  onDismiss: () => void
}

export function LapBonusToast({ data, onDismiss }: LapBonusToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (data) {
      setIsVisible(true)
      playChaChingSound()

      // Auto dismiss after 3 seconds
      const dismissTimer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300)
      }, 3000)

      return () => {
        clearTimeout(dismissTimer)
      }
    }
  }, [data, onDismiss])

  if (!data) return null

  return (
    <div
      className={`
        fixed bottom-4 left-1/2 -translate-x-1/2 z-40
        transition-all duration-300 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      <div className="px-4 py-2 rounded-lg bg-gray-900/90 border border-gray-700/50 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm">
          <span>🏠</span>
          <span className="text-gray-300">
            Lap {data.lapsCompleted} complete!{" "}
            <span className="text-green-400 font-semibold">+{data.coinsAwarded}</span> coins
          </span>
        </div>
      </div>
    </div>
  )
}
