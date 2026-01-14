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
      {/* Fun backdrop */}
      <div className="absolute inset-0 bg-purple-900/90 backdrop-blur-md" />
      
      {/* Playful overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-500/10 via-transparent to-purple-500/10" />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-lg mx-4">
        {/* Phase 1: Intro */}
        {phase === "intro" && (
          <div className="bg-white rounded-2xl p-8 shadow-playful border-4 border-purple-400 animate-bounce-in">
            <div className="text-7xl mb-4 animate-wiggle">🎭</div>
            <h1 className="text-3xl font-black text-purple-600">
              IDENTITY THEFT!
            </h1>
            <p className="text-xl text-purple-500 mt-2 font-medium">Swapping coins...</p>
          </div>
        )}

        {/* Phase 2: Swap animation */}
        {phase === "swap" && (
          <div className="bg-white rounded-2xl p-8 shadow-playful border-4 border-purple-400 animate-bounce-in">
            <div className="text-5xl mb-6 animate-spin-slow">🔄</div>
            
            <div className="flex items-center justify-center gap-8">
              {/* Player 1 */}
              <div className="text-center bg-amber-100 rounded-xl p-4 border-2 border-amber-300">
                <div className="text-3xl mb-2">👤</div>
                <p className="text-lg font-bold text-gray-800">{data.player1Name}</p>
                <p className="text-xl font-mono text-amber-600 font-bold">🪙 {data.player1OldCoins}</p>
              </div>
              
              {/* Swap arrows */}
              <div className="flex flex-col items-center gap-2">
                <div className="text-3xl animate-bounce-horizontal">⇄</div>
              </div>
              
              {/* Player 2 */}
              <div className="text-center bg-amber-100 rounded-xl p-4 border-2 border-amber-300">
                <div className="text-3xl mb-2">👤</div>
                <p className="text-lg font-bold text-gray-800">{data.player2Name}</p>
                <p className="text-xl font-mono text-amber-600 font-bold">🪙 {data.player2OldCoins}</p>
              </div>
            </div>
            
            <p className="text-xl text-purple-600 font-bold mt-6 animate-pulse">Swapping...</p>
          </div>
        )}

        {/* Phase 3: Result */}
        {phase === "result" && (
          <div className="bg-white rounded-2xl p-8 shadow-playful border-4 border-purple-400 animate-bounce-in">
            <div className="text-6xl mb-4">
              {isMyEvent ? (gained ? "🎉" : "😱") : "🎭"}
            </div>
            
            <h1 className={`text-4xl font-black ${
              isMyEvent 
                ? (gained ? "text-emerald-600" : "text-red-500")
                : "text-purple-600"
            }`}>
              {isMyEvent 
                ? (gained ? "JACKPOT!" : "OH NO!")
                : "SWAP COMPLETE!"
              }
            </h1>

            {isMyEvent ? (
              <div className="space-y-4 mt-4">
                <p className="text-lg text-gray-700 font-medium">
                  You swapped with <span className="text-purple-600 font-bold">{otherPlayer}</span>
                </p>
                
                <div className={`
                  inline-block px-8 py-4 rounded-2xl border-3
                  ${gained 
                    ? "bg-emerald-100 border-emerald-400" 
                    : "bg-red-100 border-red-400"
                  }
                `}>
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-2xl font-mono text-gray-400 line-through">{myOldCoins}</span>
                    <span className="text-3xl">→</span>
                    <span className={`text-4xl font-black ${gained ? "text-emerald-600" : "text-red-500"}`}>
                      {myNewCoins}
                    </span>
                  </div>
                  <p className={`text-xl font-bold mt-2 ${gained ? "text-emerald-600" : "text-red-500"}`}>
                    {gained ? "+" : "-"}{coinDiff} coins
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                <p className="text-lg text-gray-700 font-medium">
                  <span className="text-purple-600 font-bold">{data.player1Name}</span> and{" "}
                  <span className="text-purple-600 font-bold">{data.player2Name}</span>
                </p>
                <p className="text-gray-600">swapped their coins!</p>
                
                <div className="flex items-center justify-center gap-8 mt-4">
                  <div className="text-center bg-amber-100 rounded-xl p-3 border-2 border-amber-300">
                    <p className="font-bold text-gray-800">{data.player1Name}</p>
                    <p className="text-amber-600 font-medium">{data.player1OldCoins} → <span className="font-bold">{data.player1NewCoins}</span></p>
                  </div>
                  <div className="text-center bg-amber-100 rounded-xl p-3 border-2 border-amber-300">
                    <p className="font-bold text-gray-800">{data.player2Name}</p>
                    <p className="text-amber-600 font-medium">{data.player2OldCoins} → <span className="font-bold">{data.player2NewCoins}</span></p>
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
                    className="absolute text-2xl animate-float-up"
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
