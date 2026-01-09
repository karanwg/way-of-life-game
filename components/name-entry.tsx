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
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute top-1/3 right-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-10 left-1/3 w-80 h-80 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />

        {/* Floating emojis */}
        {["🎲", "🪙", "🎯", "🎮", "🏆", "✨", "🎉", "💫"].map((emoji, i) => (
          <div
            key={i}
            className="absolute text-3xl animate-float opacity-40"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${3 + (i % 2)}s`,
            }}
          >
            {emoji}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-full py-8 px-4">
        <div className="w-full max-w-md">
          {/* Game card */}
          <div className="backdrop-blur-xl bg-white/5 border-2 border-purple-500/30 rounded-3xl p-8 shadow-2xl">
            {/* Title */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎲</div>
              <h1 className="text-5xl font-black mb-2">
                <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
                  Way of Life
                </span>
              </h1>
              <p className="text-lg text-cyan-300 font-semibold">Answer. Move. Survive. Thrive.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-purple-300 mb-2">Enter your name</label>
                <Input
                  type="text"
                  placeholder="Your name here..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  disabled={isLoading}
                  className="text-center text-lg h-14 bg-purple-900/50 border-2 border-purple-500/50 text-white placeholder:text-purple-400 focus:border-pink-500 focus:ring-pink-500 rounded-xl"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !playerName.trim()}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-pink-500/30 hover:scale-[1.02]"
              >
                {isLoading ? "Joining..." : "🎮 Start Playing"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onReset}
                disabled={isLoading}
                className="w-full h-12 text-sm font-semibold border-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 rounded-xl transition-all bg-transparent"
              >
                Reset Game (Admin)
              </Button>
            </form>

            {/* How to play */}
            <div className="mt-8 pt-6 border-t border-purple-500/30">
              <h2 className="font-bold text-yellow-400 text-sm mb-3 flex items-center gap-2">
                <span>📖</span> How to Play
              </h2>
              <ul className="space-y-2 text-sm text-purple-200">
                <li className="flex items-start gap-2">
                  <span className="text-pink-400">🎯</span>
                  <span>
                    Answer <strong className="text-cyan-300">20 questions</strong> to move around the board
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">⏱️</span>
                  <span>
                    <strong className="text-yellow-300">20 seconds</strong> per question
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">💰</span>
                  <span>
                    <strong className="text-green-400">+100</strong> correct,{" "}
                    <strong className="text-red-400">-50</strong> wrong
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">🎲</span>
                  <span>
                    Land on tiles for <strong className="text-pink-300">wild events!</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">👥</span>
                  <span>
                    Open <strong className="text-cyan-300">multiple tabs</strong> for multiplayer
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-purple-400 text-sm">✨ May the odds be ever in your favor ✨</p>
          </div>
        </div>
      </div>
    </div>
  )
}
