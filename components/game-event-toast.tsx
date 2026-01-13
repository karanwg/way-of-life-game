"use client"

import { useEffect, useState } from "react"
import type { HeistResultData, PonziResultData, PoliceResultData, IdentityTheftResultData } from "@/lib/p2p-types"

export interface GameEventToastProps {
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

  const hasEvent = heistResult || ponziResult || policeResult || identityTheftResult

  // Check if I'm the victim
  const isVictim = 
    (heistResult && heistResult.victimName === myPlayerName) ||
    (policeResult && policeResult.victimName === myPlayerName)

  useEffect(() => {
    if (hasEvent) {
      setIsVisible(true)
      // Show longer if you're the victim
      const duration = isVictim ? 5000 : 4000
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [hasEvent, isVictim, onDismiss])

  if (!hasEvent) return null

  const renderContent = () => {
    if (heistResult) {
      const iAmVictim = heistResult.victimName === myPlayerName
      
      if (iAmVictim) {
        return (
          <div className="flex items-center gap-4">
            <div className="text-5xl animate-bounce">🚨</div>
            <div>
              <div className="font-black text-red-400 text-xl">YOU GOT ROBBED!</div>
              <div className="text-base text-white mt-1">
                <span className="text-red-300 font-bold">{heistResult.thiefName}</span> stole{" "}
                <span className="text-yellow-400 font-black text-lg">{heistResult.amountStolen} 🪙</span> from you!
              </div>
            </div>
          </div>
        )
      }
      
      return (
        <div className="flex items-center gap-3">
          <div className="text-3xl">💰</div>
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
                <span className="text-white font-semibold">{ponziResult.playerName}</span> walked away safely
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
              {won ? "Jackpot! Coins Doubled!" : "Scheme Collapsed!"}
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

    if (policeResult) {
      const iAmVictim = policeResult.victimName === myPlayerName
      
      if (iAmVictim) {
        return (
          <div className="flex items-center gap-4">
            <div className="text-5xl animate-bounce">🚔</div>
            <div>
              <div className="font-black text-red-400 text-xl">YOU GOT SNITCHED ON!</div>
              <div className="text-base text-white mt-1">
                <span className="text-blue-300 font-bold">{policeResult.snitchName}</span> reported you!
              </div>
              <div className="text-red-400 font-black text-lg mt-1">
                You lost {policeResult.coinsLost} 🪙
              </div>
            </div>
          </div>
        )
      }
      
      return (
        <div className="flex items-center gap-3">
          <div className="text-3xl">🚔</div>
          <div>
            <div className="font-bold text-blue-400">Someone Got Snitched On!</div>
            <div className="text-sm text-gray-300">
              <span className="text-white font-semibold">{policeResult.snitchName}</span> reported{" "}
              <span className="text-white font-semibold">{policeResult.victimName}</span>
            </div>
            <div className="text-xs text-red-400 mt-1">
              {policeResult.victimName} lost {policeResult.coinsLost} 🪙
            </div>
          </div>
        </div>
      )
    }

    if (identityTheftResult) {
      const iAmInvolved = 
        identityTheftResult.player1Name === myPlayerName || 
        identityTheftResult.player2Name === myPlayerName
      
      if (iAmInvolved) {
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
          <div className="flex items-center gap-4">
            <div className="text-5xl animate-bounce">🎭</div>
            <div>
              <div className={`font-black text-xl ${gained ? "text-green-400" : "text-red-400"}`}>
                IDENTITY THEFT!
              </div>
              <div className="text-base text-white mt-1">
                You swapped coins with <span className="text-purple-300 font-bold">{otherPlayer}</span>!
              </div>
              <div className={`font-black text-lg mt-1 ${gained ? "text-green-400" : "text-red-400"}`}>
                {myOldCoins} → {myNewCoins} 🪙
              </div>
            </div>
          </div>
        )
      }
      
      return (
        <div className="flex items-center gap-3">
          <div className="text-3xl">🎭</div>
          <div>
            <div className="font-bold text-purple-400">Identity Theft!</div>
            <div className="text-sm text-gray-300">
              <span className="text-white font-semibold">{identityTheftResult.player1Name}</span> and{" "}
              <span className="text-white font-semibold">{identityTheftResult.player2Name}</span> swapped coins!
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {identityTheftResult.player1Name}: {identityTheftResult.player1OldCoins} → {identityTheftResult.player1NewCoins} 🪙
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  const getBorderColor = () => {
    if (isVictim) return "border-red-500"
    if (heistResult) return "border-red-500/50"
    if (ponziResult) return ponziResult.won ? "border-green-500/50" : "border-red-500/50"
    if (policeResult) return "border-blue-500/50"
    if (identityTheftResult) {
      const iAmInvolved = 
        identityTheftResult.player1Name === myPlayerName || 
        identityTheftResult.player2Name === myPlayerName
      return iAmInvolved ? "border-purple-500" : "border-purple-500/50"
    }
    return "border-purple-500/50"
  }

  const getBackground = () => {
    if (isVictim) {
      return "bg-gradient-to-r from-red-950/95 to-rose-900/95"
    }
    return "bg-gradient-to-r from-gray-900/95 to-slate-900/95"
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
          ${getBackground()}
          backdrop-blur-sm shadow-xl
          ${isVictim ? "animate-pulse ring-2 ring-red-500/50" : ""}
        `}
      >
        {renderContent()}
      </div>
    </div>
  )
}
