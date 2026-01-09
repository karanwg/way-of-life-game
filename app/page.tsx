"use client"

import { useState, useCallback } from "react"
import { NameEntry } from "@/components/name-entry"
import { QuizScreen } from "@/components/quiz-screen"
import { Leaderboard } from "@/components/leaderboard"
import { Board } from "@/components/board"
import { EventCard, type EventCardData } from "@/components/event-card"
import { GameOver } from "@/components/game-over"
import { useGameStream } from "@/hooks/use-game-stream"
import type { Player, GameEvent } from "@/lib/types"
import { QUESTIONS } from "@/lib/questions"

export default function Home() {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [eventCard, setEventCard] = useState<EventCardData | null>(null)

  const handleGameEvent = useCallback((event: GameEvent) => {
    if (event.type === "GAME_STATE_UPDATE") {
      setAllPlayers(event.players.sort((a, b) => b.coins - a.coins))
    } else if (event.type === "GAME_RESET") {
      setPlayerId(null)
      setCurrentPlayer(null)
      setAllPlayers([])
      setEventCard(null)
    } else if (event.type === "TILE_LANDED") {
      setEventCard({
        tileName: event.tileName,
        tileText: event.tileText,
        coinsDelta: event.coinsDelta,
        isGlobal: event.isGlobal,
      })
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
    // Answer is submitted in quiz-screen
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

  if (!currentPlayer) {
    return <NameEntry onJoin={handleJoin} onReset={handleReset} />
  }

  const allPlayersComplete = allPlayers.every((p) => p.currentQuestionIndex >= QUESTIONS.length)

  if (allPlayersComplete && allPlayers.length > 0) {
    return <GameOver players={allPlayers} onPlayAgain={handleReset} />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex gap-4 p-4 overflow-hidden" style={{ height: "65%" }}>
        <div className="flex-1" style={{ width: "75%" }}>
          <div className="h-full overflow-auto">
            <Board players={allPlayers} currentPlayerId={playerId} />
          </div>
        </div>

        <div style={{ width: "25%" }}>
          <Leaderboard players={allPlayers} />
        </div>
      </div>

      <div className="flex-1 p-4 overflow-auto bg-card border-t border-border" style={{ height: "35%" }}>
        <QuizScreen player={currentPlayer} onAnswer={handleAnswer} onNextQuestion={handleNextQuestion} />
      </div>

      <EventCard event={eventCard} onDismiss={() => setEventCard(null)} />
    </div>
  )
}
