"use client"

import { useState, useCallback, useEffect } from "react"
import { NameEntry } from "@/components/name-entry"
import { QuizScreen } from "@/components/quiz-screen"
import { Leaderboard } from "@/components/leaderboard"
import { Board } from "@/components/board"
import { DiceRoller } from "@/components/dice-roller"
import { EventCard, type EventCardData } from "@/components/event-card"
import { LapBonusToast, type LapBonusData } from "@/components/lap-bonus-toast"
import { GameOver } from "@/components/game-over"
import { useGameStream } from "@/hooks/use-game-stream"
import type { Player, GameEvent } from "@/lib/types"
import { QUESTIONS } from "@/lib/questions"

const STORAGE_KEY = "way-of-life-player-id"

export default function Home() {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [eventCard, setEventCard] = useState<EventCardData | null>(null)
  const [lapBonus, setLapBonus] = useState<LapBonusData | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)
  const [diceState, setDiceState] = useState<{ value: number | null; isRolling: boolean }>({
    value: null,
    isRolling: false,
  })

  // Try to restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      const savedPlayerId = localStorage.getItem(STORAGE_KEY)
      if (!savedPlayerId) {
        setIsRestoring(false)
        return
      }

      try {
        // Check if the player still exists on the server
        const response = await fetch("/api/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get-state",
            playerId: savedPlayerId,
          }),
        })

        if (!response.ok) throw new Error("Failed to restore session")

        const data = await response.json()
        if (data.currentPlayer) {
          setPlayerId(savedPlayerId)
          setCurrentPlayer(data.currentPlayer)
        } else {
          // Player no longer exists on server, clear localStorage
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch (error) {
        console.error("Error restoring session:", error)
        localStorage.removeItem(STORAGE_KEY)
      } finally {
        setIsRestoring(false)
      }
    }

    restoreSession()
  }, [])

  // Save playerId to localStorage whenever it changes
  useEffect(() => {
    if (playerId) {
      localStorage.setItem(STORAGE_KEY, playerId)
    }
  }, [playerId])

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setPlayerId(null)
    setCurrentPlayer(null)
    setAllPlayers([])
    setEventCard(null)
  }, [])

  const handleGameEvent = useCallback((event: GameEvent) => {
    if (event.type === "GAME_STATE_UPDATE") {
      setAllPlayers(event.players.sort((a, b) => b.coins - a.coins))
    } else if (event.type === "GAME_RESET") {
      clearSession()
    } else if (event.type === "TILE_LANDED") {
      setEventCard({
        tileName: event.tileName,
        tileText: event.tileText,
        coinsDelta: event.coinsDelta,
        isGlobal: event.isGlobal,
      })
    }
  }, [clearSession])

  useGameStream(handleGameEvent)

  useEffect(() => {
    if (playerId && allPlayers.length > 0) {
      const updatedPlayer = allPlayers.find((p) => p.id === playerId)
      if (updatedPlayer) {
        setCurrentPlayer(updatedPlayer)
      }
    }
  }, [allPlayers, playerId])

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

  const handleDiceRoll = useCallback((value: number | null, isRolling: boolean) => {
    setDiceState({ value, isRolling })
  }, [])

  const handleNextQuestion = async (
    wasCorrect: boolean,
  ): Promise<{ dieRoll: number | null; tileEvent: EventCardData | null }> => {
    if (!playerId) return { dieRoll: null, tileEvent: null }

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "next-question",
          playerId,
          wasCorrect,
        }),
      })

      if (!response.ok) throw new Error("Failed to advance question")

      const data = await response.json()
      if (data.player) {
        setCurrentPlayer(data.player)
      }

      // Show lap bonus toast after dice animation (only if correct answer)
      if (data.lapBonus && wasCorrect) {
        setTimeout(() => {
          setLapBonus(data.lapBonus)
        }, 1200)
      }

      // Show tile event card after dice animation (only if correct answer)
      if (data.tileEvent && wasCorrect) {
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
      clearSession()
    } catch (error) {
      console.error("Error resetting game:", error)
    }
  }

  // Show loading while restoring session
  if (isRestoring) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-purple-300 text-lg">Restoring your game...</p>
        </div>
      </div>
    )
  }

  if (!playerId || !currentPlayer) {
    return <NameEntry onJoin={handleJoin} onReset={handleReset} />
  }

  const allPlayersComplete =
    allPlayers.length > 0 && allPlayers.every((p) => p.currentQuestionIndex >= QUESTIONS.length)

  if (allPlayersComplete) {
    return <GameOver players={allPlayers} onPlayAgain={handleReset} />
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col overflow-hidden">
      {/* Top section - 65% height: Board + Leaderboard */}
      <div className="flex gap-3 p-3" style={{ height: "65%" }}>
        {/* Board - 75% width */}
        <div className="h-full relative" style={{ width: "75%" }}>
          <Board players={allPlayers} currentPlayerId={playerId} />

          {/* Dice overlay on board */}
          {diceState.value !== null && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center rounded-2xl">
              <div className="text-center">
                <DiceRoller value={diceState.value} isRolling={diceState.isRolling} />
                {!diceState.isRolling && diceState.value !== null && (
                  <p className="text-white mt-3 text-lg font-semibold animate-bounce-in">
                    Moving {diceState.value} {diceState.value === 1 ? "space" : "spaces"}!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard - 25% width */}
        <div className="h-full" style={{ width: "25%" }}>
          <Leaderboard players={allPlayers} />
        </div>
      </div>

      {/* Bottom section - 35% height: Quiz */}
      <div className="flex-1 p-3 pt-0" style={{ height: "35%" }}>
        <div className="h-full bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-3 overflow-hidden">
          <QuizScreen player={currentPlayer} onAnswer={handleAnswer} onNextQuestion={handleNextQuestion} onDiceRoll={handleDiceRoll} />
        </div>
      </div>

      {/* Event Card Overlay */}
      <EventCard event={eventCard} onDismiss={() => setEventCard(null)} />

      {/* Lap Bonus Toast */}
      <LapBonusToast data={lapBonus} onDismiss={() => setLapBonus(null)} />
    </div>
  )
}
