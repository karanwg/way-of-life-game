"use client"

import { useEffect, useState } from "react"
import type { HeistResultData, PonziResultData, MarriageResultData } from "@/lib/p2p-types"

interface GameEventToastProps {
  heistResult?: HeistResultData | null
  ponziResult?: PonziResultData | null
  marriageResult?: MarriageResultData | null
  jailApplied?: string | null
  skippedDueToJail?: boolean
  onDismiss: () => void
}

export function GameEventToast({
  heistResult,
  ponziResult,
  marriageResult,
  jailApplied,
  skippedDueToJail,
  onDismiss,
}: GameEventToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  const hasEvent = heistResult || ponziResult || marriageResult || jailApplied || skippedDueToJail

  useEffect(() => {
    if (hasEvent) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [hasEvent, onDismiss])

  if (!hasEvent) return null

  const renderContent = () => {
    if (heistResult) {
      return (
        <div className="flex items-center gap-3">
          <div className="text-3xl">🔫</div>
          <div>
            <div className="font-bold text-red-400">Heist Complete!</div>
            <div className="text-sm text-gray-300">
              <span className="text-white font-semibold">{heistResult.thiefName}</span> stole{" "}
              <span className="text-yellow-400 font-bold">{heistResult.amountStolen} 🪙</span> from{" "}
              <span className="text-white font-semibold">{heistResult.victimName}</span>
            </div>
          </div>
        </div>
      )
    }

    if (ponziResult) {
      if (!ponziResult.invested) {
        return (
          <div className="flex items-center gap-3">
            <div className="text-3xl">🚶</div>
            <div>
              <div className="font-bold text-gray-400">Skipped the Scheme</div>
              <div className="text-sm text-gray-300">
                <span className="text-white font-semibold">{ponziResult.playerName}</span> walked away from the ponzi scheme
              </div>
            </div>
          </div>
        )
      }
      
      const won = ponziResult.won
      return (
        <div className="flex items-center gap-3">
          <div className="text-3xl">{won ? "🎉" : "💸"}</div>
          <div>
            <div className={`font-bold ${won ? "text-green-400" : "text-red-400"}`}>
              Ponzi Scheme: {won ? "Won!" : "Lost!"}
            </div>
            <div className="text-sm text-gray-300">
              <span className="text-white font-semibold">{ponziResult.playerName}</span>{" "}
              {won ? "gained" : "lost"}{" "}
              <span className={`font-bold ${won ? "text-green-400" : "text-red-400"}`}>
                {Math.abs(ponziResult.coinsChange || 0)} 🪙
              </span>
            </div>
          </div>
        </div>
      )
    }

    if (marriageResult) {
      return (
        <div className="flex items-center gap-3">
          <div className="text-3xl">💒</div>
          <div>
            <div className="font-bold text-pink-400">Marriage!</div>
            <div className="text-sm text-gray-300">
              <span className="text-white font-semibold">{marriageResult.player1Name}</span> and{" "}
              <span className="text-white font-semibold">{marriageResult.player2Name}</span> got married!
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Pooled {marriageResult.pooledCoins} 🪙 → Each received {marriageResult.eachReceived} 🪙
            </div>
          </div>
        </div>
      )
    }

    if (jailApplied) {
      return (
        <div className="flex items-center gap-3">
          <div className="text-3xl">⛓️</div>
          <div>
            <div className="font-bold text-gray-400">Sent to Jail!</div>
            <div className="text-sm text-gray-300">
              <span className="text-white font-semibold">{jailApplied}</span> will skip their next movement
            </div>
          </div>
        </div>
      )
    }

    if (skippedDueToJail) {
      return (
        <div className="flex items-center gap-3">
          <div className="text-3xl">🔓</div>
          <div>
            <div className="font-bold text-green-400">Released from Jail!</div>
            <div className="text-sm text-gray-300">
              Movement skipped, but you're free now!
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  const getBorderColor = () => {
    if (heistResult) return "border-red-500/50"
    if (ponziResult) return ponziResult.won ? "border-green-500/50" : "border-red-500/50"
    if (marriageResult) return "border-pink-500/50"
    if (jailApplied || skippedDueToJail) return "border-gray-500/50"
    return "border-purple-500/50"
  }

  return (
    <div
      className={`
        fixed top-20 left-1/2 -translate-x-1/2 z-40
        transition-all duration-300 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
      `}
    >
      <div
        className={`
          px-6 py-4 rounded-xl border-2 ${getBorderColor()}
          bg-gradient-to-r from-gray-900/95 to-slate-900/95
          backdrop-blur-sm shadow-xl
        `}
      >
        {renderContent()}
      </div>
    </div>
  )
}
