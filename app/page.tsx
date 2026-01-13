"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { RoomLobby } from "@/components/room-lobby"
import { QuizScreen } from "@/components/quiz-screen"
import { Leaderboard } from "@/components/leaderboard"
import { Board } from "@/components/board"
import { DiceRoller } from "@/components/dice-roller"
import { EventCard, type EventCardData } from "@/components/event-card"
import { LapBonusToast, type LapBonusData } from "@/components/lap-bonus-toast"
import { GameOver } from "@/components/game-over"
import { HeistModal } from "@/components/heist-modal"
import { PonziModal } from "@/components/ponzi-modal"
import { PoliceModal } from "@/components/police-modal"
import { GameEventToast } from "@/components/game-event-toast"
import { FlyingCoins } from "@/components/flying-coins"
import { GameCountdown } from "@/components/game-countdown"
import { usePeerGame, type MoveResultForUI } from "@/hooks/use-peer-game"
import type { Player } from "@/lib/types"
import type { HeistPromptData, PonziPromptData, PolicePromptData, HeistResultData, PonziResultData, PoliceResultData, IdentityTheftResultData } from "@/lib/p2p-types"
import { QUESTIONS } from "@/lib/questions"

export default function Home() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [eventCard, setEventCard] = useState<EventCardData | null>(null)
  const [lapBonus, setLapBonus] = useState<LapBonusData | null>(null)
  const [diceState, setDiceState] = useState<{ value: number | null; isRolling: boolean }>({
    value: null,
    isRolling: false,
  })

  // Interactive prompts
  const [heistPrompt, setHeistPrompt] = useState<HeistPromptData | null>(null)
  const [ponziPrompt, setPonziPrompt] = useState<PonziPromptData | null>(null)
  const [policePrompt, setPolicePrompt] = useState<PolicePromptData | null>(null)

  // Event notifications
  const [heistResult, setHeistResult] = useState<HeistResultData | null>(null)
  const [ponziResult, setPonziResult] = useState<PonziResultData | null>(null)
  const [policeResult, setPoliceResult] = useState<PoliceResultData | null>(null)
  const [identityTheftResult, setIdentityTheftResult] = useState<IdentityTheftResultData | null>(null)

  // Flying coins animation
  const [flyingCoins, setFlyingCoins] = useState<{
    fromPlayerId: string
    toPlayerId: string
    amount: number
  } | null>(null)

  // Game start countdown
  const [showCountdown, setShowCountdown] = useState(false)

  // Ref to access latest players in callbacks
  const allPlayersRef = useRef<Player[]>([])
  
  useEffect(() => {
    allPlayersRef.current = allPlayers
  }, [allPlayers])

  const handlePlayersUpdate = useCallback((players: Player[]) => {
    setAllPlayers(players)
    allPlayersRef.current = players
  }, [])

  const handleError = useCallback((error: string) => {
    console.error("P2P Error:", error)
    alert(error)
  }, [])

  const handleHostDisconnected = useCallback(() => {
    alert("The host has disconnected. Please join a new room.")
  }, [])

  // Clear all state when a new game starts
  const handleGameStarted = useCallback(() => {
    setEventCard(null)
    setLapBonus(null)
    setDiceState({ value: null, isRolling: false })
    setHeistPrompt(null)
    setPonziPrompt(null)
    setPolicePrompt(null)
    setHeistResult(null)
    setPonziResult(null)
    setPoliceResult(null)
    setIdentityTheftResult(null)
    setFlyingCoins(null)
    // Show countdown when game starts
    setShowCountdown(true)
  }, [])

  const handleGameReset = useCallback(() => {
    setAllPlayers([])
    setEventCard(null)
    setLapBonus(null)
    setDiceState({ value: null, isRolling: false })
    // Clear all prompts
    setHeistPrompt(null)
    setPonziPrompt(null)
    setPolicePrompt(null)
    // Clear all result states
    setHeistResult(null)
    setPonziResult(null)
    setPoliceResult(null)
    setIdentityTheftResult(null)
    setFlyingCoins(null)
    setShowCountdown(false)
  }, [])

  const handleHeistPrompt = useCallback((data: HeistPromptData) => {
    setHeistPrompt(data)
  }, [])

  const handlePonziPrompt = useCallback((data: PonziPromptData) => {
    setPonziPrompt(data)
  }, [])

  const handlePolicePrompt = useCallback((data: PolicePromptData) => {
    setPolicePrompt(data)
  }, [])

  const handleHeistResult = useCallback((result: HeistResultData) => {
    setHeistPrompt(null)
    
    // Trigger flying coins animation
    const players = allPlayersRef.current
    const thief = players.find((p) => p.name === result.thiefName)
    const victim = players.find((p) => p.name === result.victimName)
    
    if (thief && victim && result.amountStolen > 0) {
      setFlyingCoins({
        fromPlayerId: victim.id,
        toPlayerId: thief.id,
        amount: result.amountStolen,
      })
      // Delay showing the toast until animation completes
      setTimeout(() => {
        setHeistResult(result)
      }, 600)
    } else {
      setHeistResult(result)
    }
  }, [])

  const handlePonziResult = useCallback((result: PonziResultData) => {
    setPonziPrompt(null)
    setPonziResult(result)
  }, [])

  const handlePoliceResult = useCallback((result: PoliceResultData) => {
    setPolicePrompt(null)
    setPoliceResult(result)
  }, [])

  const handleIdentityTheftEvent = useCallback((result: IdentityTheftResultData) => {
    setIdentityTheftResult(result)
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
    selectHeistTarget,
    makePonziChoice,
    selectPoliceTarget,
    resetGame,
    leaveGame,
  } = usePeerGame({
    onPlayersUpdate: handlePlayersUpdate,
    onGameStarted: handleGameStarted,
    onError: handleError,
    onHostDisconnected: handleHostDisconnected,
    onGameReset: handleGameReset,
    onHeistPrompt: handleHeistPrompt,
    onPonziPrompt: handlePonziPrompt,
    onPolicePrompt: handlePolicePrompt,
    onHeistResult: handleHeistResult,
    onPonziResult: handlePonziResult,
    onPoliceResult: handlePoliceResult,
    onIdentityTheftEvent: handleIdentityTheftEvent,
  })

  const handleDiceRoll = useCallback((value: number | null, isRolling: boolean) => {
    setDiceState({ value, isRolling })
  }, [])

  const handleAnswer = useCallback(
    async (questionIndex: number, answerIndex: number) => {
      submitAnswer(questionIndex, answerIndex)
    },
    [submitAnswer]
  )

  const handleNextQuestion = useCallback(
    async (wasCorrect: boolean): Promise<{ dieRoll: number | null; tileEvent: EventCardData | null }> => {
      const result = await advanceQuestion(wasCorrect)

      // Handle lap bonus display
      if (result.lapBonus && wasCorrect) {
        setTimeout(() => {
          setLapBonus(result.lapBonus)
        }, 1200)
      }

      // Check if there's an interactive prompt - if so, skip the EventCard
      const hasInteractivePrompt = result.heistPrompt || result.ponziPrompt || result.policePrompt

      // Handle tile event display (after dice animation) - but NOT for interactive tiles
      if (result.tileEvent && wasCorrect && !hasInteractivePrompt) {
        setTimeout(() => {
          setEventCard({
            tileName: result.tileEvent!.tileName,
            tileText: result.tileEvent!.tileText,
            coinsDelta: result.tileEvent!.coinsDelta,
            isGlobal: false,
          })
        }, 1500)
      }

      return {
        dieRoll: result.dieRoll,
        tileEvent: result.tileEvent ? {
          tileName: result.tileEvent.tileName,
          tileText: result.tileEvent.tileText,
          coinsDelta: result.tileEvent.coinsDelta,
          isGlobal: false,
        } : null,
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

  const clearEventToasts = useCallback(() => {
    setHeistResult(null)
    setPonziResult(null)
    setPoliceResult(null)
    setIdentityTheftResult(null)
  }, [])

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

          {/* Flying Coins Animation */}
          {flyingCoins && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <FlyingCoins
                fromPlayerId={flyingCoins.fromPlayerId}
                toPlayerId={flyingCoins.toPlayerId}
                amount={flyingCoins.amount}
                players={allPlayers}
                onComplete={() => setFlyingCoins(null)}
              />
            </div>
          )}

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

      {/* Bottom section - 35% height: Quiz or Countdown */}
      <div className="flex-1 p-3 pt-0" style={{ height: "35%" }}>
        <div className="h-full bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-3 overflow-hidden">
          {showCountdown ? (
            <GameCountdown onComplete={() => setShowCountdown(false)} />
          ) : (
            <QuizScreen
              player={myPlayer}
              onAnswer={handleAnswer}
              onNextQuestion={handleNextQuestion}
              onDiceRoll={handleDiceRoll}
              onSessionExpired={handleSessionExpired}
            />
          )}
        </div>
      </div>

      {/* Event Card Overlay */}
      <EventCard event={eventCard} onDismiss={() => setEventCard(null)} />

      {/* Lap Bonus Toast */}
      <LapBonusToast data={lapBonus} onDismiss={() => setLapBonus(null)} />

      {/* Heist Modal */}
      {heistPrompt && (
        <HeistModal data={heistPrompt} onSelectTarget={selectHeistTarget} />
      )}

      {/* Ponzi Modal */}
      {ponziPrompt && (
        <PonziModal data={ponziPrompt} onChoice={makePonziChoice} />
      )}

      {/* Police Modal */}
      {policePrompt && (
        <PoliceModal data={policePrompt} onSelectTarget={selectPoliceTarget} />
      )}

      {/* Game Event Toast */}
      <GameEventToast
        heistResult={heistResult}
        ponziResult={ponziResult}
        policeResult={policeResult}
        identityTheftResult={identityTheftResult}
        myPlayerName={myPlayer?.name}
        onDismiss={clearEventToasts}
      />
    </div>
  )
}
