"use client"

import { useEffect, useState } from "react"
import type { HeistResultData, PonziResultData, PoliceResultData, IdentityTheftResultData } from "@/lib/p2p-types"
import { playChaChingSound, playLoseMoneySound } from "@/lib/sounds"

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
      
      // Play appropriate sound
      if (isMyHeist && heistResult) {
        if (heistResult.thiefName === myPlayerName) {
          playChaChingSound() // I stole money
        } else {
          playLoseMoneySound() // I got robbed
        }
      } else if (isMyPonzi && ponziResult && ponziResult.invested) {
        if (ponziResult.won) {
          playChaChingSound()
        } else {
          playLoseMoneySound()
        }
      } else if (isMyPolice && policeResult) {
        if (policeResult.victimName === myPlayerName) {
          playLoseMoneySound() // I got snitched on
        }
      } else if (isMyIdentityTheft && identityTheftResult) {
        const myNewCoins = identityTheftResult.player1Name === myPlayerName 
          ? identityTheftResult.player1NewCoins 
          : identityTheftResult.player2NewCoins
        const myOldCoins = identityTheftResult.player1Name === myPlayerName 
          ? identityTheftResult.player1OldCoins 
          : identityTheftResult.player2OldCoins
        if (myNewCoins > myOldCoins) {
          playChaChingSound()
        } else {
          playLoseMoneySound()
        }
      }
      
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      // Dismiss immediately if not relevant to me
      onDismiss()
    }
  }, [hasRelevantEvent, onDismiss, isMyHeist, heistResult, isMyPonzi, ponziResult, isMyPolice, policeResult, isMyIdentityTheft, identityTheftResult, myPlayerName])

  if (!hasRelevantEvent) return null

  const renderContent = () => {
    if (isMyHeist && heistResult) {
      const iAmVictim = heistResult.victimName === myPlayerName
      const iAmThief = heistResult.thiefName === myPlayerName
      
      if (iAmVictim) {
        return (
          <div className="flex items-center gap-2 text-sm">
            <span>💸</span>
            <span className="text-gray-700">
              <span className="text-red-600 font-bold">{heistResult.thiefName}</span> stole{" "}
              <span className="text-amber-600 font-bold">{heistResult.amountStolen} 🪙</span> from you
            </span>
          </div>
        )
      }
      
      if (iAmThief) {
        return (
          <div className="flex items-center gap-2 text-sm">
            <span>💰</span>
            <span className="text-gray-700">
              You stole <span className="text-emerald-600 font-bold">{heistResult.amountStolen} 🪙</span> from{" "}
              <span className="text-gray-800 font-bold">{heistResult.victimName}</span>
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
            <span className="text-gray-700">You skipped the gamble</span>
          </div>
        )
      }
      
      const won = ponziResult.won
      return (
        <div className="flex items-center gap-2 text-sm">
          <span>{won ? "🎉" : "💸"}</span>
          <span className="text-gray-700">
            {won ? "Jackpot! " : "Bad luck! "}
            <span className={won ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
              {won ? "+" : ""}{ponziResult.coinsChange} 🪙
            </span>
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
            <span className="text-gray-700">
              <span className="text-sky-600 font-bold">{policeResult.snitchName}</span> reported you!{" "}
              <span className="text-red-600 font-bold">-{policeResult.coinsLost} 🪙</span>
            </span>
          </div>
        )
      }
      
      if (iAmSnitch) {
        return (
          <div className="flex items-center gap-2 text-sm">
            <span>🚔</span>
            <span className="text-gray-700">
              You reported <span className="text-gray-800 font-bold">{policeResult.victimName}</span>
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
          <span className="text-gray-700">
            Swapped coins with <span className="text-purple-600 font-bold">{otherPlayer}</span>{" "}
            <span className={gained ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
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
      <div className="px-4 py-2 rounded-xl bg-white/95 border-2 border-amber-300 shadow-card backdrop-blur-sm">
        {renderContent()}
      </div>
    </div>
  )
}
