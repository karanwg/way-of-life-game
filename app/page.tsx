"use client"

import { useState, useCallback } from "react"
import { NameEntry } from "@/components/name-entry"
import { QuizScreen } from "@/components/quiz-screen"
import { Leaderboard } from "@/components/leaderboard"
import { useGameStream } from "@/hooks/use-game-stream"
import type { Player, GameEvent } from "@/lib/types"

export default function Home() {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])

  // Subscribe to real-time game events
  const handleGameEvent = useCallback((event: GameEvent) => {
    if (event.type === "GAME_STATE_UPDATE") {
      setAllPlayers(event.players.sort((a, b) => b.coins - a.coins))
    } else if (event.type === "GAME_RESET") {
      setPlayerId(null)
      setCurrentPlayer(null)
      setAllPlayers([])
    }
  }, [])

  useGameStream(handleGameEvent)

  const handleJoin = async (playerName: string) => {
    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          playerName,
        }),
      })

      if (!response.ok) throw new Error("Failed to join game")

      const data = await response.json()
      setPlayerId(data.playerId)
      setCurrentPlayer(data.player)
    } catch (error) {
      console.error("Error joining game:", error)
      alert("Failed to join game. Please try again.")
    }
  }

  const handleAnswer = async (questionIndex: number, answerIndex: number) => {
    // Answer is submitted in quiz-screen, this is for any post-answer logic
  }

  const handleNextQuestion = async () => {
    if (!playerId) return

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "next-question",
          playerId,
        }),
      })

      if (!response.ok) throw new Error("Failed to advance question")

      const data = await response.json()
      setCurrentPlayer(data.player)
    } catch (error) {
      console.error("Error advancing to next question:", error)
    }
  }

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset the entire game?")) {
      return
    }

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      })

      if (!response.ok) throw new Error("Failed to reset game")
    } catch (error) {
      console.error("Error resetting game:", error)
    }
  }

  // Show name entry if no player
  if (!currentPlayer) {
    return <NameEntry onJoin={handleJoin} onReset={handleReset} />
  }

  // Show quiz with leaderboard
  return (
    <div className="min-h-screen bg-background">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4">
        {/* Quiz Screen - Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-lg p-6">
            <QuizScreen player={currentPlayer} onAnswer={handleAnswer} onNextQuestion={handleNextQuestion} />
          </div>
        </div>

        {/* Leaderboard - Sidebar */}
        <div className="lg:col-span-1">
          <Leaderboard players={allPlayers} />
        </div>
      </div>
    </div>
  )
}
