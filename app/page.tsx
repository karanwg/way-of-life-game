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
import { IdentityTheftModal } from "@/components/identity-theft-modal"
import { usePeerGame, type MoveResultForUI } from "@/hooks/use-peer-game"
import type { Player } from "@/lib/types"
import type { HeistPromptData, PonziPromptData, PolicePromptData, HeistResultData, PonziResultData, PoliceResultData, IdentityTheftResultData } from "@/lib/p2p-types"
import { QUESTIONS } from "@/lib/questions"
import { toggleBGM, isBGMPlaying } from "@/lib/bgm"

type ActiveView = "quiz" | "board"

export default function Home() {
  // Actual game state (updates immediately)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  // Display state for board (delayed during dice animation)
  const [displayPlayers, setDisplayPlayers] = useState<Player[]>([])
  
  const [eventCard, setEventCard] = useState<EventCardData | null>(null)
  const [lapBonus, setLapBonus] = useState<LapBonusData | null>(null)
  const [diceState, setDiceState] = useState<{ value: number | null; rolls: number[]; isRolling: boolean }>({
    value: null,
    rolls: [],
    isRolling: false,
  })
  
  // View state - quiz or board
  const [activeView, setActiveView] = useState<ActiveView>("quiz")
  
  // BGM state
  const [bgmPlaying, setBgmPlaying] = useState(false)

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
  
  // Ref for return-to-quiz timeout
  const returnToQuizTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Track if there's a pending interactive prompt (to block return to quiz)
  const hasPendingPromptRef = useRef(false)
  
  
  useEffect(() => {
    allPlayersRef.current = allPlayers
  }, [allPlayers])
  
  // Schedule return to quiz view (used after events resolve)
  const scheduleReturnToQuiz = useCallback((delayMs: number = 2000) => {
    // Don't schedule if there's a pending interactive prompt
    if (hasPendingPromptRef.current) {
      return
    }
    if (returnToQuizTimeoutRef.current) {
      clearTimeout(returnToQuizTimeoutRef.current)
    }
    returnToQuizTimeoutRef.current = setTimeout(() => {
      setActiveView("quiz")
    }, delayMs)
  }, [])
  
  const cancelReturnToQuiz = useCallback(() => {
    if (returnToQuizTimeoutRef.current) {
      clearTimeout(returnToQuizTimeoutRef.current)
      returnToQuizTimeoutRef.current = null
    }
  }, [])

  const handlePlayersUpdate = useCallback((players: Player[]) => {
    setAllPlayers(players)
    setDisplayPlayers(players) // Always update immediately - AnimatedPawn handles delay
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
    setDiceState({ value: null, rolls: [], isRolling: false })
    setHeistPrompt(null)
    setPonziPrompt(null)
    setPolicePrompt(null)
    setHeistResult(null)
    setPonziResult(null)
    setPoliceResult(null)
    setIdentityTheftResult(null)
    setFlyingCoins(null)
    // Show countdown when game starts (on board view)
    setActiveView("board")
    setShowCountdown(true)
  }, [])

  const handleGameReset = useCallback(() => {
    setAllPlayers([])
    setDisplayPlayers([])
    setEventCard(null)
    setLapBonus(null)
    setDiceState({ value: null, rolls: [], isRolling: false })
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
    setActiveView("quiz")
    hasPendingPromptRef.current = false
  }, [])

  // Delay for pawn animation: 1900ms start delay + (350ms hop + 80ms pause) * 4 tiles max + buffer
  const PAWN_ANIMATION_DELAY = 4000

  const handleHeistPrompt = useCallback((data: HeistPromptData) => {
    hasPendingPromptRef.current = true // Block return to quiz
    cancelReturnToQuiz()
    // Delay showing modal until pawn animation completes
    setTimeout(() => {
      setHeistPrompt(data)
    }, PAWN_ANIMATION_DELAY)
  }, [cancelReturnToQuiz])

  const handlePonziPrompt = useCallback((data: PonziPromptData) => {
    hasPendingPromptRef.current = true // Block return to quiz
    cancelReturnToQuiz()
    // Delay showing modal until pawn animation completes
    setTimeout(() => {
      setPonziPrompt(data)
    }, PAWN_ANIMATION_DELAY)
  }, [cancelReturnToQuiz])

  const handlePolicePrompt = useCallback((data: PolicePromptData) => {
    hasPendingPromptRef.current = true // Block return to quiz
    cancelReturnToQuiz()
    // Delay showing modal until pawn animation completes
    setTimeout(() => {
      setPolicePrompt(data)
    }, PAWN_ANIMATION_DELAY)
  }, [cancelReturnToQuiz])

  // Helper to clear all toasts before showing new ones
  const clearAllToasts = useCallback(() => {
    setHeistResult(null)
    setPonziResult(null)
    setPoliceResult(null)
    setIdentityTheftResult(null)
    setLapBonus(null)
    setEventCard(null)
  }, [])

  const handleHeistResult = useCallback((result: HeistResultData) => {
    setHeistPrompt(null)
    hasPendingPromptRef.current = false // Allow return to quiz
    clearAllToasts()
    
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

    // Schedule return to quiz after seeing result
    scheduleReturnToQuiz(3000)
  }, [clearAllToasts, scheduleReturnToQuiz])

  const handlePonziResult = useCallback((result: PonziResultData) => {
    setPonziPrompt(null)
    hasPendingPromptRef.current = false // Allow return to quiz
    clearAllToasts()
    setPonziResult(result)
    scheduleReturnToQuiz(3000)
  }, [clearAllToasts, scheduleReturnToQuiz])

  const handlePoliceResult = useCallback((result: PoliceResultData) => {
    setPolicePrompt(null)
    hasPendingPromptRef.current = false // Allow return to quiz
    clearAllToasts()
    setPoliceResult(result)
    scheduleReturnToQuiz(3000)
  }, [clearAllToasts, scheduleReturnToQuiz])

  const handleIdentityTheftEvent = useCallback((result: IdentityTheftResultData) => {
    hasPendingPromptRef.current = true // Block return to quiz - big modal incoming
    cancelReturnToQuiz()
    clearAllToasts()
    // Delay showing modal until pawn animation completes
    setTimeout(() => {
      setIdentityTheftResult(result)
    }, PAWN_ANIMATION_DELAY)
  }, [clearAllToasts, cancelReturnToQuiz])

  const handleGlobalEvent = useCallback((event: { tileName: string; tileText: string; coinsDelta: number; isGlobal?: boolean; affectedPlayerName?: string }) => {
    // Show global events (from other players) as an event card
    clearAllToasts()
    // Delay to let pawn animation complete
    setTimeout(() => {
      setEventCard({
        tileName: event.tileName,
        tileText: event.tileText,
        coinsDelta: event.coinsDelta,
        isGlobal: true,
        affectedPlayerName: event.affectedPlayerName,
      })
    }, PAWN_ANIMATION_DELAY)
  }, [clearAllToasts])

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
    onGlobalEvent: handleGlobalEvent,
  })

  const handleDiceRoll = useCallback((value: number | null, isRolling: boolean, rolls?: number[]) => {
    setDiceState({ value, rolls: rolls || [], isRolling })
    
    // Switch to board view when dice starts rolling
    if (isRolling && value !== null) {
      setActiveView("board")
      cancelReturnToQuiz()
    }
    
    // When dice is fully hidden, schedule return to quiz
    if (value === null && !isRolling) {
      scheduleReturnToQuiz(3000) // Give time to see movement + events
    }
  }, [cancelReturnToQuiz, scheduleReturnToQuiz])

  const handleAnswer = useCallback(
    async (questionIndex: number, answerIndex: number) => {
      submitAnswer(questionIndex, answerIndex)
    },
    [submitAnswer]
  )

  const handleNextQuestion = useCallback(
    async (wasCorrect: boolean): Promise<{ dieRoll: number | null; tileEvent: EventCardData | null }> => {
      const result = await advanceQuestion(wasCorrect)

      // Dice sequence 1700ms + pawn start buffer 200ms + pawn animation ~1700ms = ~3600ms
      const TOTAL_ANIMATION_DELAY = 4000

      // Handle lap bonus display (after pawn animation)
      if (result.lapBonus && wasCorrect) {
        setTimeout(() => {
          clearAllToasts()
          setLapBonus(result.lapBonus)
        }, TOTAL_ANIMATION_DELAY)
      }

      // Check if there's an interactive prompt - if so, skip the EventCard
      const hasInteractivePrompt = result.heistPrompt || result.ponziPrompt || result.policePrompt

      // Handle tile event display (after pawn animation) - but NOT for interactive tiles
      if (result.tileEvent && wasCorrect && !hasInteractivePrompt) {
        setTimeout(() => {
          clearAllToasts()
          setEventCard({
            tileName: result.tileEvent!.tileName,
            tileText: result.tileEvent!.tileText,
            coinsDelta: result.tileEvent!.coinsDelta,
            isGlobal: false,
          })
        }, TOTAL_ANIMATION_DELAY)
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
    [advanceQuestion, clearAllToasts]
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

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false)
    setActiveView("quiz")
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
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-emerald-700 text-lg font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-200 overflow-hidden">
      {/* Subtle cloud shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-10 w-64 h-32 bg-white rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-48 h-24 bg-white rounded-full blur-3xl" />
      </div>

      {/* Room code indicator */}
      <div className="absolute top-1 right-1 z-20 bg-[#FAF8F0] px-3 py-1.5 rounded-lg shadow-lg border-2 border-amber-300">
        <span className="text-xs text-amber-700 font-medium">Room: </span>
        <span className="text-sm font-mono font-bold text-green-700">{roomState.roomCode}</span>
      </div>

      {/* BGM toggle */}
      <button
        onClick={() => {
          const nowPlaying = toggleBGM()
          setBgmPlaying(nowPlaying)
        }}
        className={`
          absolute bottom-3 left-3 z-20 
          px-3 py-2 rounded-xl shadow-lg border-2 
          transition-all hover:scale-105 flex items-center gap-2
          ${bgmPlaying 
            ? "bg-green-100 border-green-400 hover:bg-green-50" 
            : "bg-[#FAF8F0] border-amber-300 hover:bg-white"}
        `}
        title={bgmPlaying ? "Mute music" : "Play music"}
      >
        <span className="text-lg">{bgmPlaying ? "🎵" : "🔇"}</span>
        <span className={`font-semibold text-xs ${bgmPlaying ? "text-green-700" : "text-amber-800"}`}>
          {bgmPlaying ? "On" : "Off"}
        </span>
      </button>

      {/* View toggle button - centered in board panel (75% width panel, so center at ~37.5%) */}
      <button
        onClick={() => setActiveView(activeView === "quiz" ? "board" : "quiz")}
        className="absolute top-5 left-[37.5%] -translate-x-1/2 z-20 bg-[#FAF8F0] hover:bg-white px-5 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg border-2 border-amber-300"
      >
        <span className="text-lg">{activeView === "quiz" ? "🎮" : "❓"}</span>
        <span className="text-sm text-amber-800 font-semibold">
          {activeView === "quiz" ? "View Board" : "View Quiz"}
        </span>
      </button>

      {/* Board View - Full Screen */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
          activeView === "board" 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="h-full w-full flex gap-3 p-3">
          {/* Board - 75% width */}
          <div className="h-full relative rounded-2xl overflow-hidden" style={{ width: "75%" }}>
            <Board players={displayPlayers} currentPlayerId={myPlayerId} />

            {/* Flying Coins Animation */}
            {flyingCoins && (
              <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <FlyingCoins
                  fromPlayerId={flyingCoins.fromPlayerId}
                  toPlayerId={flyingCoins.toPlayerId}
                  amount={flyingCoins.amount}
                  players={displayPlayers}
                  onComplete={() => setFlyingCoins(null)}
                />
              </div>
            )}

            {/* Dice overlay on board */}
            {diceState.value !== null && (
              <div className="absolute inset-0 bg-green-900/70 backdrop-blur-sm z-30 flex items-center justify-center rounded-2xl">
                <div className="text-center bg-[#FAF8F0] rounded-2xl p-8 shadow-2xl border-4 border-amber-700/80">
                  <DiceRoller value={diceState.value} isRolling={diceState.isRolling} />
                  {!diceState.isRolling && diceState.value !== null && (
                    <p className="text-green-700 mt-4 text-lg font-bold animate-bounce-in">
                      Moving {diceState.value} {diceState.value === 1 ? "space" : "spaces"}!
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Countdown overlay */}
            {showCountdown && (
              <div className="absolute inset-0 bg-green-900/70 backdrop-blur-sm z-40 flex items-center justify-center rounded-2xl">
                <GameCountdown onComplete={handleCountdownComplete} />
              </div>
            )}
          </div>

          {/* Leaderboard - 25% width */}
          <div className="h-full" style={{ width: "25%" }}>
            <Leaderboard players={allPlayers} />
          </div>
        </div>
      </div>

      {/* Quiz View - Full Screen */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
          activeView === "quiz" 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="h-full w-full flex gap-3 p-3">
          {/* Quiz Section - 75% width */}
          <div className="h-full" style={{ width: "75%" }}>
            <div className="h-full bg-[#FAF8F0] border-4 border-amber-700/80 rounded-2xl p-6 overflow-hidden shadow-xl">
              <QuizScreen
                player={myPlayer}
                onAnswer={handleAnswer}
                onNextQuestion={handleNextQuestion}
                onDiceRoll={handleDiceRoll}
                onSessionExpired={handleSessionExpired}
                isActive={activeView === "quiz" && !heistPrompt && !ponziPrompt && !policePrompt && !identityTheftResult && !showCountdown}
              />
            </div>
          </div>

          {/* Leaderboard - 25% width */}
          <div className="h-full" style={{ width: "25%" }}>
            <Leaderboard players={allPlayers} />
          </div>
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

      {/* Identity Theft Modal */}
      {identityTheftResult && (
        <IdentityTheftModal 
          data={identityTheftResult} 
          myPlayerName={myPlayer?.name}
          onDismiss={() => {
            setIdentityTheftResult(null)
            hasPendingPromptRef.current = false
            scheduleReturnToQuiz(1000)
          }}
        />
      )}

      {/* Game Event Toast - exclude identity theft since it has its own modal */}
      <GameEventToast
        heistResult={heistResult}
        ponziResult={ponziResult}
        policeResult={policeResult}
        identityTheftResult={null}
        myPlayerName={myPlayer?.name}
        onDismiss={clearEventToasts}
      />
    </div>
  )
}
