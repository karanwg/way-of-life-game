"use client"

import { useEffect, useState, useRef } from "react"
import { X } from "lucide-react"
import { playChaChingSound, playLoseMoneySound } from "@/lib/sounds"

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

function getTileEmoji(tileName: string): string {
  if (tileName.includes("GO")) return "🏠"
  if (tileName.includes("Train") || tileName.includes("Station")) return "🚂"
  if (tileName.includes("Bus")) return "🚌"
  if (tileName.includes("Coffee")) return "☕"
  if (tileName.includes("Bakery")) return "🥐"
  if (tileName.includes("Flower")) return "🌸"
  if (tileName.includes("Candy")) return "🍬"
  if (tileName.includes("Ice Cream")) return "🍦"
  if (tileName.includes("Lemonade")) return "🍋"
  if (tileName.includes("Yard")) return "🏷️"
  if (tileName.includes("Thrift")) return "👕"
  if (tileName.includes("Tax")) return "💰"
  if (tileName.includes("Parking")) return "🅿️"
  if (tileName.includes("Visiting")) return "👀"
  if (tileName.includes("Community")) return "📦"
  if (tileName.includes("Chance") || tileName.includes("Casino")) return "🎰"
  if (tileName.includes("Heist") || tileName.includes("Pickpocket")) return "🎭"
  if (tileName.includes("Police")) return "🚔"
  return "🎲"
}

export function EventCard({ event, onDismiss }: EventCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showCoins, setShowCoins] = useState(false)
  const onDismissRef = useRef(onDismiss)
  const eventIdRef = useRef<string | null>(null)

  // Keep the ref updated
  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    if (event) {
      // Create a unique ID for this event to prevent re-triggering
      const eventId = `${event.tileName}-${event.coinsDelta}-${Date.now()}`
      
      // If this is the same event instance, don't re-run
      if (eventIdRef.current === eventId) return
      eventIdRef.current = eventId

      setIsVisible(true)
      setShowCoins(false)

      if (event.coinsDelta > 0) playChaChingSound()
      else if (event.coinsDelta < 0) playLoseMoneySound()

      const coinTimer = setTimeout(() => setShowCoins(true), 300)
      const dismissTimer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onDismissRef.current(), 400)
      }, 4000)

      return () => {
        clearTimeout(coinTimer)
        clearTimeout(dismissTimer)
      }
    } else {
      eventIdRef.current = null
    }
  }, [event])

  if (!event) return null

  const emoji = getTileEmoji(event.tileName)
  const isPositive = event.coinsDelta > 0
  const isNegative = event.coinsDelta < 0

  return (
    <div
      className={`
        fixed inset-0 flex items-center justify-center pointer-events-none z-50
        transition-all duration-400
        ${isVisible ? "opacity-100" : "opacity-0"}
      `}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-green-900/60 backdrop-blur-sm transition-opacity ${isVisible ? "opacity-100" : "opacity-0"}`} />

      {/* Card */}
      <div
        className={`
          pointer-events-auto relative w-[90%] max-w-sm
          bg-[#FAF8F0] rounded-2xl border-4 border-amber-700/80 shadow-2xl
          overflow-hidden
          transform transition-all duration-400 ease-out
          ${isVisible ? "scale-100 translate-y-0" : "scale-90 translate-y-8"}
        `}
      >
        {/* Header band */}
        <div className={`py-4 px-6 text-center relative ${
          isPositive ? "bg-gradient-to-r from-green-600 to-green-700" :
          isNegative ? "bg-gradient-to-r from-red-500 to-red-600" :
          "bg-gradient-to-r from-amber-500 to-amber-600"
        }`}>
          <button
            onClick={() => { setIsVisible(false); setTimeout(onDismiss, 300) }}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <span className="text-4xl block mb-1">{emoji}</span>
          <h2 className="text-xl font-black text-white">{event.tileName}</h2>
        </div>

        <div className="p-6 text-center">
          {/* Description */}
          <p className="text-gray-700 mb-5">{event.tileText}</p>

          {/* Coin effect */}
          {event.coinsDelta !== 0 && (
            <div
              className={`
                inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2
                ${isPositive 
                  ? "bg-green-50 border-green-400" 
                  : "bg-red-50 border-red-400"}
                ${showCoins ? "animate-bounce-in" : "opacity-0"}
              `}
            >
              <span className="text-2xl">🪙</span>
              <span className={`text-2xl font-black ${isPositive ? "text-green-600" : "text-red-600"}`}>
                {isPositive ? "+" : ""}{event.coinsDelta}
              </span>
            </div>
          )}

          {/* Global indicator */}
          {event.isGlobal && (
            <div className="mt-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold border border-amber-300">
                ⚡ Everyone Affected
              </span>
            </div>
          )}

          {/* Triggered by */}
          {event.affectedPlayerName && (
            <p className="mt-4 text-gray-500 text-sm">
              Triggered by: <span className="text-gray-700 font-medium">{event.affectedPlayerName}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
