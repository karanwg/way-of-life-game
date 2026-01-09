"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

export interface EventCardData {
  tileName: string
  tileText: string
  coinsDelta: number
  isGlobal: boolean
  affectedPlayerName?: string
}

interface EventCardProps {
  event: EventCardData | null
  onDismiss: () => void
}

export function EventCard({ event, onDismiss }: EventCardProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (event) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [event, onDismiss])

  if (!event || !isVisible) return null

  const isDelta = event.coinsDelta !== 0
  const isPositive = event.coinsDelta > 0

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div
        className={`pointer-events-auto bg-card border-2 rounded-lg p-6 max-w-sm shadow-2xl transform transition-all duration-300 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        } ${isPositive ? "border-green-500/50" : "border-orange-500/50"}`}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onDismiss, 300)
          }}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tile Name */}
        <h3 className="text-lg font-bold text-foreground mb-2">{event.tileName}</h3>

        {/* Flavor Text */}
        <p className="text-sm text-muted-foreground italic mb-4">{event.tileText}</p>

        {/* Effect Summary */}
        {isDelta && (
          <div
            className={`text-center font-bold text-base mb-3 p-2 rounded ${
              isPositive
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : "bg-orange-500/10 text-orange-700 dark:text-orange-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {event.coinsDelta} coins
            {event.isGlobal && <span className="block text-xs mt-1">(Global Effect)</span>}
          </div>
        )}

        {/* Global Note */}
        {event.isGlobal && (
          <p className="text-xs text-center text-muted-foreground italic">
            {event.affectedPlayerName ? `Affects ${event.affectedPlayerName} and others` : "All players affected"}
          </p>
        )}
      </div>
    </div>
  )
}
