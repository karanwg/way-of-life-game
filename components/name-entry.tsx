"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface NameEntryProps {
  onJoin: (playerName: string) => void
  onReset: () => void
}

export function NameEntry({ onJoin, onReset }: NameEntryProps) {
  const [playerName, setPlayerName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) return

    setIsLoading(true)
    try {
      onJoin(playerName)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-amber-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-4000"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="backdrop-blur-xl bg-slate-900/40 border border-cyan-500/30 rounded-2xl p-8 shadow-2xl space-y-8">
            <div className="space-y-4 text-center">
              <h1 className="text-6xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-pink-500 via-cyan-500 to-amber-400 bg-clip-text text-transparent">
                  Way of Life
                </span>
              </h1>
              <p className="text-lg text-cyan-200 font-semibold">Answer. Move. Survive. Thrive.</p>
              <p className="text-sm text-slate-400">A Monopoly-style journey through the chaos of existence</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-cyan-300 mb-3">What's your name, player?</label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  disabled={isLoading}
                  className="text-center text-lg h-12 bg-slate-800/80 border-pink-500/50 text-cyan-50 placeholder:text-slate-500 focus:border-pink-500 focus:ring-pink-500"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !playerName.trim()}
                className="w-full h-12 text-base font-bold bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-pink-500/50"
              >
                {isLoading ? "Entering the game..." : "Join the Game"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onReset}
                disabled={isLoading}
                className="w-full h-12 text-base font-semibold border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500 rounded-lg transition-all duration-200 bg-transparent"
              >
                Reset Game (Admin)
              </Button>
            </form>

            <div className="space-y-3 pt-4 border-t border-slate-700/50">
              <h2 className="font-bold text-amber-400 text-sm uppercase tracking-widest">How to Play:</h2>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-pink-500 font-bold">→</span>
                  <span>
                    Answer <span className="text-cyan-300 font-semibold">20 MCQ questions</span> to move around the
                    board
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 font-bold">→</span>
                  <span>
                    <span className="text-amber-300 font-semibold">20 seconds</span> per question before auto-skip
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">→</span>
                  <span>
                    <span className="text-green-400 font-semibold">+100 coins</span> correct,{" "}
                    <span className="text-red-400 font-semibold">-50 coins</span> wrong
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">→</span>
                  <span>
                    Land on <span className="text-pink-300 font-semibold">tiles</span> to trigger wild events
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold">→</span>
                  <span>
                    Open <span className="text-cyan-300 font-semibold">multiple tabs</span> to simulate multiplayer
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-slate-500 text-sm">
              <span className="text-amber-400">✨</span> May the odds be ever in your favor{" "}
              <span className="text-amber-400">✨</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
