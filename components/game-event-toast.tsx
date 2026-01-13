"use client"

import { useEffect, useState } from "react"
import type { HeistResultData, PonziResultData, PoliceResultData, IdentityTheftResultData } from "@/lib/p2p-types"

interface GameEventToastProps {
  heistResult?: HeistResultData | null
  ponziResult?: PonziResultData | null
  policeResult?: PoliceResultData | null
  identityTheftResult?: IdentityTheftResultData | null
  myPlayerName?: string
  onDismiss: () => void
}

export function GameEventToast({
  heistResult,
  ponziResult,
  policeResult,
  identityTheftResult,
  myPlayerName,
  onDismiss,
}: GameEventToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Only show events that involve the current player
  const isMyHeist = heistResult && (heistResult.thiefName === myPlayerName || heistResult.victimName === myPlayerName)
  const isMyPonzi = ponziResult && ponziResult.playerName === myPlayerName
  const isMyPolice = policeResult && (policeResult.snitchName === myPlayerName || policeResult.victimName === myPlayerName)
  const isMyIdentityTheft = identityTheftResult && (identityTheftResult.player1Name === myPlayerName || identityTheftResult.player2Name === myPlayerName)

  const hasRelevantEvent = isMyHeist || isMyPonzi || isMyPolice || isMyIdentityTheft

  useEffect(() => {
    if (hasRelevantEvent) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      // Dismiss immediately if not relevant to me
      onDismiss()
    }
  }, [hasRelevantEvent, onDismiss])

  if (!hasRelevantEvent) return null

  const renderContent = () => {
    if (isMyHeist && heistResult) {
      const iAmVictim = heistResult.victimName === myPlayerName
      const iAmThief = heistResult.thiefName === myPlayerName
      
      if (iAmVictim) {
        return (
          <div className="flex items-center gap-2 text-sm">
            <span>💸</span>
            <span className="text-gray-300">
              <span className="text-red-400 font-semibold">{heistResult.thiefName}</span> stole{" "}
              <span className="text-yellow-400 font-semibold">{heistResult.amountStolen}</span> coins from you
            </span>
          </div>
        )
      }
      
      if (iAmThief) {
        return (
          <div className="flex items-center gap-2 text-sm">
            <span>💰</span>
            <span className="text-gray-300">
              You stole <span className="text-green-400 font-semibold">{heistResult.amountStolen}</span> coins from{" "}
              <span className="text-white font-semibold">{heistResult.victimName}</span>
            </span>
          </div>
        )
      }
    }

    if (isMyPonzi && ponziResult) {
      if (!ponziResult.invested) {
        return (
          <div className="flex items-center gap-2 text-sm">
            <span>🚶</span>
            <span className="text-gray-300">You skipped the scheme</span>
          </div>
        )
      }
      
      const won = ponziResult.won
      return (
        <div className="flex items-center gap-2 text-sm">
          <span>{won ? "🎉" : "💸"}</span>
          <span className="text-gray-300">
            {won ? "Jackpot! " : "Scheme collapsed! "}
            <span className={won ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
              {won ? "+" : ""}{ponziResult.coinsChange}
            </span> coins
          </span>
        </div>
      )
    }

    if (isMyPolice && policeResult) {
      const iAmVictim = policeResult.victimName === myPlayerName
      const iAmSnitch = policeResult.snitchName === myPlayerName
      
      if (iAmVictim) {
        return (
          <div className="flex items-center gap-2 text-sm">
            <span>🚔</span>
            <span className="text-gray-300">
              <span className="text-blue-400 font-semibold">{policeResult.snitchName}</span> snitched on you!{" "}
              <span className="text-red-400 font-semibold">-{policeResult.coinsLost}</span> coins
            </span>
          </div>
        )
      }
      
      if (iAmSnitch) {
        return (
          <div className="flex items-center gap-2 text-sm">
            <span>🚔</span>
            <span className="text-gray-300">
              You reported <span className="text-white font-semibold">{policeResult.victimName}</span>
            </span>
          </div>
        )
      }
    }

    if (isMyIdentityTheft && identityTheftResult) {
      const myOldCoins = identityTheftResult.player1Name === myPlayerName 
        ? identityTheftResult.player1OldCoins 
        : identityTheftResult.player2OldCoins
      const myNewCoins = identityTheftResult.player1Name === myPlayerName 
        ? identityTheftResult.player1NewCoins 
        : identityTheftResult.player2NewCoins
      const otherPlayer = identityTheftResult.player1Name === myPlayerName 
        ? identityTheftResult.player2Name 
        : identityTheftResult.player1Name
      const gained = myNewCoins > myOldCoins
      
      return (
        <div className="flex items-center gap-2 text-sm">
          <span>🎭</span>
          <span className="text-gray-300">
            Identity theft! Swapped coins with <span className="text-purple-400 font-semibold">{otherPlayer}</span>{" "}
            <span className={gained ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
              ({myOldCoins} → {myNewCoins})
            </span>
          </span>
        </div>
      )
    }

    return null
  }

  return (
    <div
      className={`
        fixed bottom-4 left-1/2 -translate-x-1/2 z-40
        transition-all duration-300 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      <div className="px-4 py-2 rounded-lg bg-gray-900/90 border border-gray-700/50 shadow-lg backdrop-blur-sm">
        {renderContent()}
      </div>
    </div>
  )
}
