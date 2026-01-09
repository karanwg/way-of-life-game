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

  const handleNextQuestion = async (): Promise<{ dieRoll: number | null; tileEvent: EventCardData | null }> => {
    if (!playerId) return { dieRoll: null, tileEvent: null }

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

      // Show tile event card after dice animation
      if (data.tileEvent) {
        setTimeout(() => {
          setEventCard(data.tileEvent)
        }, 1500)
      }

      return {
        dieRoll: data.dieRoll,
        tileEvent: data.tileEvent,
      }
    } catch (error) {
      console.error("Error advancing to next question:", error)
      return { dieRoll: null, tileEvent: null }
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
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col overflow-hidden">
      {/* Top section - 65% height: Board + Leaderboard */}
      <div className="flex gap-3 p-3" style={{ height: "65%" }}>
        {/* Board - 75% width */}
        <div className="h-full" style={{ width: "75%" }}>
          <Board players={allPlayers} currentPlayerId={playerId} />
        </div>

        {/* Leaderboard - 25% width */}
        <div className="h-full" style={{ width: "25%" }}>
          <Leaderboard players={allPlayers} />
        </div>
      </div>

      {/* Bottom section - 35% height: Quiz */}
      <div className="flex-1 p-3 pt-0" style={{ height: "35%" }}>
        <div className="h-full bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-3 overflow-hidden">
          <QuizScreen player={currentPlayer} onAnswer={handleAnswer} onNextQuestion={handleNextQuestion} />
        </div>
      </div>

      {/* Event Card Overlay */}
      <EventCard event={eventCard} onDismiss={() => setEventCard(null)} />
    </div>
  )
}
