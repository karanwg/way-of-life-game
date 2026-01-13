"use client"

import { useState, useCallback } from "react"
import { RoomLobby } from "@/components/room-lobby"
import { QuizScreen } from "@/components/quiz-screen"
import { Leaderboard } from "@/components/leaderboard"
import { Board } from "@/components/board"
import { DiceRoller } from "@/components/dice-roller"
import { EventCard, type EventCardData } from "@/components/event-card"
import { LapBonusToast, type LapBonusData } from "@/components/lap-bonus-toast"
import { GameOver } from "@/components/game-over"
import { usePeerGame } from "@/hooks/use-peer-game"
import type { Player } from "@/lib/types"
import { QUESTIONS } from "@/lib/questions"

export default function Home() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [eventCard, setEventCard] = useState<EventCardData | null>(null)
  const [lapBonus, setLapBonus] = useState<LapBonusData | null>(null)
  const [diceState, setDiceState] = useState<{ value: number | null; isRolling: boolean }>({
    value: null,
    isRolling: false,
  })

  const handlePlayersUpdate = useCallback((players: Player[]) => {
    setAllPlayers(players)
  }, [])

  const handleError = useCallback((error: string) => {
    console.error("P2P Error:", error)
    alert(error)
  }, [])

  const handleHostDisconnected = useCallback(() => {
    alert("The host has disconnected. Please join a new room.")
  }, [])

  const handleGameReset = useCallback(() => {
    setAllPlayers([])
    setEventCard(null)
    setLapBonus(null)
    setDiceState({ value: null, isRolling: false })
  }, [])

  const {
    roomState,
    myPlayerId,
    myPlayer,
    createRoom,
    joinRoom,
    startGame,
    submitAnswer,
    advanceQuestion,
    resetGame,
    leaveGame,
  } = usePeerGame({
    onPlayersUpdate: handlePlayersUpdate,
    onError: handleError,
    onHostDisconnected: handleHostDisconnected,
    onGameReset: handleGameReset,
  })

  const handleDiceRoll = useCallback((value: number | null, isRolling: boolean) => {
    setDiceState({ value, isRolling })
  }, [])

  // Handle answer submission from quiz screen
  const handleAnswer = useCallback(
    async (questionIndex: number, answerIndex: number) => {
      submitAnswer(questionIndex, answerIndex)
    },
    [submitAnswer]
  )

  // Handle next question - returns dice roll and tile event
  const handleNextQuestion = useCallback(
    async (wasCorrect: boolean): Promise<{ dieRoll: number | null; tileEvent: EventCardData | null }> => {
      // advanceQuestion now returns a Promise with the result directly
      const result = await advanceQuestion(wasCorrect)

      // Handle lap bonus display
      if (result.lapBonus && wasCorrect) {
        setTimeout(() => {
          setLapBonus(result.lapBonus)
        }, 1200)
      }

      // Handle tile event display
      if (result.tileEvent && wasCorrect) {
        setTimeout(() => {
          setEventCard(result.tileEvent)
        }, 1500)
      }

      return {
        dieRoll: result.dieRoll,
        tileEvent: result.tileEvent,
      }
    },
    [advanceQuestion]
  )

  const handleSessionExpired = useCallback(() => {
    alert("Connection lost. Please rejoin the room.")
    leaveGame()
  }, [leaveGame])

  const handlePlayAgain = useCallback(() => {
    if (roomState.role === "host") {
      resetGame()
    }
    leaveGame()
  }, [leaveGame, resetGame, roomState.role])

  // Show lobby if game hasn't started
  if (!roomState.gameStarted) {
    return (
      <RoomLobby
        roomState={roomState}
        myPlayer={myPlayer}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onStartGame={startGame}
        onLeaveRoom={leaveGame}
      />
    )
  }

  // Show game over screen if all players have finished
  const allPlayersComplete =
    allPlayers.length > 0 && allPlayers.every((p) => p.currentQuestionIndex >= QUESTIONS.length)

  if (allPlayersComplete) {
    return <GameOver players={allPlayers} onPlayAgain={handlePlayAgain} />
  }

  // Make sure we have a player
  if (!myPlayer || !myPlayerId) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-purple-300 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col overflow-hidden">
      {/* Room code indicator */}
      <div className="absolute top-2 right-2 z-20 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
        <span className="text-xs text-purple-300">Room: </span>
        <span className="text-sm font-mono font-bold text-cyan-400">{roomState.roomCode}</span>
      </div>

      {/* Top section - 65% height: Board + Leaderboard */}
      <div className="flex gap-3 p-3" style={{ height: "65%" }}>
        {/* Board - 75% width */}
        <div className="h-full relative" style={{ width: "75%" }}>
          <Board players={allPlayers} currentPlayerId={myPlayerId} />

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
          <QuizScreen
            player={myPlayer}
            onAnswer={handleAnswer}
            onNextQuestion={handleNextQuestion}
            onDiceRoll={handleDiceRoll}
            onSessionExpired={handleSessionExpired}
          />
        </div>
      </div>

      {/* Event Card Overlay */}
      <EventCard event={eventCard} onDismiss={() => setEventCard(null)} />

      {/* Lap Bonus Toast */}
      <LapBonusToast data={lapBonus} onDismiss={() => setLapBonus(null)} />
    </div>
  )
}
