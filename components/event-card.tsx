"use client"

import { useEffect, useState } from "react"
import { X, Coins, Zap, MapPin, Shuffle, Heart, Lock, Briefcase } from "lucide-react"

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

// Get icon and colors based on event type
function getEventStyle(coinsDelta: number, tileName: string) {
  // Special tiles
  if (tileName.includes("Jail") || tileName.includes("Cancelled")) {
    return {
      icon: Lock,
      bg: "from-gray-700 to-slate-800",
      border: "border-gray-500",
      iconBg: "bg-gray-600",
      emoji: "⛓️",
    }
  }
  if (tileName.includes("Married")) {
    return {
      icon: Heart,
      bg: "from-pink-600 to-rose-700",
      border: "border-pink-400",
      iconBg: "bg-pink-500",
      emoji: "💍",
    }
  }
  if (tileName.includes("Viral")) {
    return {
      icon: Zap,
      bg: "from-orange-600 to-red-700",
      border: "border-orange-400",
      iconBg: "bg-orange-500",
      emoji: "📱",
    }
  }
  if (tileName.includes("Teleport") || tileName.includes("Blacked Out") || tileName.includes("Ohio")) {
    return {
      icon: MapPin,
      bg: "from-purple-600 to-violet-700",
      border: "border-purple-400",
      iconBg: "bg-purple-500",
      emoji: "🌀",
    }
  }
  if (tileName.includes("Random") || tileName.includes("Giveaway")) {
    return {
      icon: Shuffle,
      bg: "from-yellow-500 to-amber-600",
      border: "border-yellow-400",
      iconBg: "bg-yellow-500",
      emoji: "🎁",
    }
  }
  if (tileName.includes("Internship") || tileName.includes("Grindset")) {
    return {
      icon: Briefcase,
      bg: "from-cyan-600 to-teal-700",
      border: "border-cyan-400",
      iconBg: "bg-cyan-500",
      emoji: "📋",
    }
  }
  if (tileName.includes("Spawn") || tileName.includes("Birth")) {
    return {
      icon: Zap,
      bg: "from-emerald-600 to-green-700",
      border: "border-emerald-400",
      iconBg: "bg-emerald-500",
      emoji: "👶",
    }
  }

  // Coin-based
  if (coinsDelta > 0) {
    return {
      icon: Coins,
      bg: "from-yellow-500 to-amber-600",
      border: "border-yellow-300",
      iconBg: "bg-yellow-500",
      emoji: "💰",
    }
  }
  if (coinsDelta < 0) {
    return {
      icon: Coins,
      bg: "from-red-600 to-rose-700",
      border: "border-red-400",
      iconBg: "bg-red-500",
      emoji: "💸",
    }
  }

  // Neutral
  return {
    icon: Zap,
    bg: "from-slate-600 to-gray-700",
    border: "border-slate-400",
    iconBg: "bg-slate-500",
    emoji: "🌀",
  }
}

export function EventCard({ event, onDismiss }: EventCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showCoins, setShowCoins] = useState(false)

  useEffect(() => {
    if (event) {
      setIsVisible(true)
      setShowCoins(false)

      // Delay coin animation
      const coinTimer = setTimeout(() => setShowCoins(true), 300)

      // Auto dismiss
      const dismissTimer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 400)
      }, 5000)

      return () => {
        clearTimeout(coinTimer)
        clearTimeout(dismissTimer)
      }
    }
  }, [event, onDismiss])

  if (!event) return null

  const style = getEventStyle(event.coinsDelta, event.tileName)
  const Icon = style.icon
  const isDelta = event.coinsDelta !== 0
  const isPositive = event.coinsDelta > 0

  return (
    <div
      className={`
      fixed inset-0 flex items-center justify-center pointer-events-none z-50
      transition-all duration-400
      ${isVisible ? "opacity-100" : "opacity-0"}
    `}
    >
      {/* Backdrop blur */}
      <div
        className={`
        absolute inset-0 bg-black/40 backdrop-blur-sm
        transition-opacity duration-300
        ${isVisible ? "opacity-100" : "opacity-0"}
      `}
      />

      {/* Card */}
      <div
        className={`
          pointer-events-auto relative
          w-[90%] max-w-md
          rounded-2xl border-4 ${style.border}
          bg-gradient-to-br ${style.bg}
          shadow-2xl
          transform transition-all duration-400 ease-out
          ${isVisible ? "scale-100 translate-y-0" : "scale-90 translate-y-8"}
        `}
      >
        {/* Close button */}
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onDismiss, 300)
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6 pt-8">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className={`
              w-20 h-20 rounded-full ${style.iconBg}
              flex items-center justify-center
              shadow-lg animate-bounce-in
            `}
            >
              <span className="text-5xl">{style.emoji}</span>
            </div>
          </div>

          {/* Tile name */}
          <h2 className="text-2xl font-black text-white text-center mb-3 text-balance">{event.tileName}</h2>

          {/* Flavor text */}
          <p className="text-base text-white/80 italic text-center mb-4 leading-relaxed">"{event.tileText}"</p>

          {/* Coin effect */}
          {isDelta && (
            <div
              className={`
              flex items-center justify-center gap-3 p-4 rounded-xl
              ${isPositive ? "bg-yellow-500/20" : "bg-red-500/20"}
              ${showCoins ? "animate-bounce-in" : "opacity-0"}
            `}
            >
              <div
                className={`
                text-4xl font-black
                ${isPositive ? "text-yellow-300" : "text-red-300"}
              `}
              >
                {isPositive ? "+" : ""}
                {event.coinsDelta}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-3xl animate-coin-spin">🪙</span>
                <span className="text-lg font-bold text-white">coins</span>
              </div>
            </div>
          )}

          {/* Global effect indicator */}
          {event.isGlobal && (
            <div className="mt-4 text-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium">
                <Zap className="w-4 h-4 text-yellow-400" />
                Global Effect - Everyone Affected!
              </span>
            </div>
          )}

          {/* Player affected */}
          {event.affectedPlayerName && (
            <p className="mt-3 text-center text-white/70 text-sm">
              Triggered by: <span className="font-bold text-white">{event.affectedPlayerName}</span>
            </p>
          )}
        </div>

        {/* Decorative sparkles */}
        <div className="absolute top-4 left-6 text-2xl animate-sparkle" style={{ animationDelay: "0ms" }}>
          ✨
        </div>
        <div className="absolute top-8 right-12 text-xl animate-sparkle" style={{ animationDelay: "200ms" }}>
          ✨
        </div>
        <div className="absolute bottom-6 left-8 text-xl animate-sparkle" style={{ animationDelay: "400ms" }}>
          ✨
        </div>
        <div className="absolute bottom-4 right-6 text-2xl animate-sparkle" style={{ animationDelay: "100ms" }}>
          ✨
        </div>
      </div>
    </div>
  )
}
