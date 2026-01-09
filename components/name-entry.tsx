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
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-4xl font-bold text-foreground">Quiz Game</h1>
            <p className="text-muted-foreground">Enter your name to join the multiplayer quiz</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={isLoading}
                className="text-center text-lg h-12"
                autoFocus
              />
            </div>

            <Button type="submit" disabled={isLoading || !playerName.trim()} className="w-full h-12 text-base">
              {isLoading ? "Joining..." : "Join Game"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              disabled={isLoading}
              className="w-full h-12 text-base bg-transparent"
            >
              Reset Game (Admin)
            </Button>
          </form>

          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="font-semibold text-foreground mb-2">How to Play:</h2>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Answer 20 multiple choice questions</li>
              <li>• You have 20 seconds per question</li>
              <li>• +100 coins for correct answers</li>
              <li>• -50 coins for incorrect answers</li>
              <li>• Open multiple tabs to simulate other players</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
