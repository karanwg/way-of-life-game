"use client"

import { useEffect, useState } from "react"
import type { IdentityTheftResultData } from "@/lib/p2p-types"
import { playChaChingSound, playLoseMoneySound } from "@/lib/sounds"

interface IdentityTheftModalProps {
  data: IdentityTheftResultData
  myPlayerName?: string
  onDismiss: () => void
}

export function IdentityTheftModal({ data, myPlayerName, onDismiss }: IdentityTheftModalProps) {
  const [phase, setPhase] = useState<"intro" | "swap" | "result">("intro")
  const [showCoins, setShowCoins] = useState(false)

  const isMyEvent = data.player1Name === myPlayerName || data.player2Name === myPlayerName
  
  const myOldCoins = data.player1Name === myPlayerName 
    ? data.player1OldCoins 
    : data.player2OldCoins
  const myNewCoins = data.player1Name === myPlayerName 
    ? data.player1NewCoins 
    : data.player2NewCoins
  const otherPlayer = data.player1Name === myPlayerName 
    ? data.player2Name 
    : data.player1Name
  const otherOldCoins = data.player1Name === myPlayerName 
    ? data.player2OldCoins 
    : data.player1OldCoins
  const gained = myNewCoins > myOldCoins
  const coinDiff = Math.abs(myNewCoins - myOldCoins)

  useEffect(() => {
    // Dramatic reveal sequence
    const timer1 = setTimeout(() => setPhase("swap"), 1000)
    const timer2 = setTimeout(() => {
      setPhase("result")
      setShowCoins(true)
      // Play sound based on outcome
      if (isMyEvent) {
        if (gained) {
          playChaChingSound()
        } else {
          playLoseMoneySound()
        }
      }
    }, 2500)
    const timer3 = setTimeout(onDismiss, 6000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [onDismiss, gained, isMyEvent])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dramatic backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-pulse-slow" />
      
      {/* Glitch effect overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-cyan-500/10" />
        {/* Scan lines */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.1) 2px, rgba(0,255,255,0.1) 4px)",
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-lg mx-4">
        {/* Phase 1: Intro */}
        {phase === "intro" && (
          <div className="animate-pulse">
            <div className="text-8xl mb-4 animate-bounce">🎭</div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 animate-pulse">
              IDENTITY THEFT
            </h1>
            <p className="text-xl text-purple-300 mt-2">Initiating coin swap...</p>
          </div>
        )}

        {/* Phase 2: Swap animation */}
        {phase === "swap" && (
          <div className="space-y-6">
            <div className="text-6xl animate-spin-slow">🔄</div>
            
            <div className="flex items-center justify-center gap-8">
              {/* Player 1 */}
              <div className="text-center">
                <div className="text-4xl mb-2">👤</div>
                <p className="text-lg font-bold text-white">{data.player1Name}</p>
                <p className="text-2xl font-mono text-yellow-400">{data.player1OldCoins}</p>
              </div>
              
              {/* Swap arrows */}
              <div className="flex flex-col items-center gap-2">
                <div className="text-3xl animate-bounce-horizontal">⇄</div>
              </div>
              
              {/* Player 2 */}
              <div className="text-center">
                <div className="text-4xl mb-2">👤</div>
                <p className="text-lg font-bold text-white">{data.player2Name}</p>
                <p className="text-2xl font-mono text-yellow-400">{data.player2OldCoins}</p>
              </div>
            </div>
            
            <p className="text-xl text-cyan-300 animate-pulse">Swapping identities...</p>
          </div>
        )}

        {/* Phase 3: Result */}
        {phase === "result" && (
          <div className="space-y-6">
            <div className="text-7xl mb-4">
              {isMyEvent ? (gained ? "🎉" : "😱") : "🎭"}
            </div>
            
            <h1 className={`text-5xl font-black ${
              isMyEvent 
                ? (gained ? "text-green-400" : "text-red-400")
                : "text-purple-400"
            }`}>
              {isMyEvent 
                ? (gained ? "JACKPOT!" : "OH NO!")
                : "IDENTITY SWAP!"
              }
            </h1>

            {isMyEvent ? (
              <div className="space-y-4">
                <p className="text-xl text-gray-300">
                  You swapped coins with <span className="text-purple-400 font-bold">{otherPlayer}</span>
                </p>
                
                <div className={`
                  inline-block px-8 py-4 rounded-2xl
                  ${gained 
                    ? "bg-green-500/20 border-2 border-green-400" 
                    : "bg-red-500/20 border-2 border-red-400"
                  }
                `}>
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-3xl font-mono text-gray-400 line-through">{myOldCoins}</span>
                    <span className="text-4xl">→</span>
                    <span className={`text-5xl font-black ${gained ? "text-green-400" : "text-red-400"}`}>
                      {myNewCoins}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold mt-2 ${gained ? "text-green-300" : "text-red-300"}`}>
                    {gained ? "+" : "-"}{coinDiff} coins
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xl text-gray-300">
                  <span className="text-purple-400 font-bold">{data.player1Name}</span> and{" "}
                  <span className="text-cyan-400 font-bold">{data.player2Name}</span>
                </p>
                <p className="text-lg text-gray-400">swapped their coins!</p>
                
                <div className="flex items-center justify-center gap-8 mt-4">
                  <div className="text-center">
                    <p className="text-white font-bold">{data.player1Name}</p>
                    <p className="text-gray-400">{data.player1OldCoins} → <span className="text-yellow-400">{data.player1NewCoins}</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold">{data.player2Name}</p>
                    <p className="text-gray-400">{data.player2OldCoins} → <span className="text-yellow-400">{data.player2NewCoins}</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Floating coins effect */}
            {showCoins && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute text-3xl animate-float-up"
                    style={{
                      left: `${10 + (i * 7)}%`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: "2s",
                    }}
                  >
                    🪙
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
