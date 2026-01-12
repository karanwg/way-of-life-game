"use client"

import { useEffect, useState } from "react"
import { Trophy } from "lucide-react"

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

      // Auto dismiss after 4 seconds
      const dismissTimer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300)
      }, 4000)

      return () => {
        clearTimeout(dismissTimer)
      }
    }
  }, [data, onDismiss])

  if (!data) return null

  return (
    <div
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-40
        transition-all duration-300 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      <div
        className="
          flex items-center gap-3 px-5 py-3
          bg-gradient-to-r from-emerald-600 to-green-600
          border-2 border-emerald-400
          rounded-full shadow-lg shadow-emerald-500/30
        "
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500">
          <Trophy className="w-5 h-5 text-white" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">
            Lap {data.lapsCompleted} Complete!
          </span>
          <span className="text-emerald-200">•</span>
          <span className="text-yellow-300 font-bold flex items-center gap-1">
            +{data.coinsAwarded}
            <span className="text-lg">🪙</span>
          </span>
        </div>

        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onDismiss, 300)
          }}
          className="ml-2 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white/80 hover:text-white transition-colors text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
