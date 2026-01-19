/**
 * Main Game Page - Thin orchestration layer
 * 
 * This page renders the appropriate view based on game state.
 * All state management is handled by useGame hook.
 * 
 * VIEW HIERARCHY:
 * - Lobby: Before game starts
 * - Game: During gameplay (Quiz + Board views)
 * - GameOver: After all players finish
 * 
 * NOTIFICATION SYSTEM:
 * - Only one notification at a time (via activeNotification)
 * - Notifications are type-discriminated for proper rendering
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import { RoomLobby } from "@/components/room-lobby"
import { QuizScreen } from "@/components/quiz-screen"
import { Leaderboard } from "@/components/leaderboard"
import { Board } from "@/components/board"
import { DiceRoller } from "@/components/dice-roller"
import { EventCard, type EventCardData } from "@/components/event-card"
import { LapBonusToast } from "@/components/lap-bonus-toast"
import { GameOver } from "@/components/game-over"
import { HeistModal } from "@/components/heist-modal"
import { PonziModal } from "@/components/ponzi-modal"
import { PoliceModal } from "@/components/police-modal"
import { SwapMeetModal } from "@/components/swap-meet-modal"
import { GameEventToast } from "@/components/game-event-toast"
import { FlyingCoins } from "@/components/flying-coins"
import { GameCountdown } from "@/components/game-countdown"
import { IdentityTheftModal } from "@/components/identity-theft-modal"
import { useGame } from "@/hooks/use-game"
import { QUESTIONS } from "@/lib/questions"
import { toggleBGM, isBGMPlaying, switchToGameplayMusic, switchToLobbyMusic, startBGM } from "@/lib/bgm"

export default function Home() {
  const game = useGame()
  const { state } = game
  
  // Local UI state
  const [bgmPlaying, setBgmPlaying] = useState(true) // Music ON by default
  
  // Start music on mount and switch tracks based on game phase
  useEffect(() => {
    // Start lobby music on initial load (if not already playing)
    if (!isBGMPlaying()) {
      startBGM("lobby")
      setBgmPlaying(true)
    }
  }, [])
  
  // Switch music based on game phase
  useEffect(() => {
    if (state.gamePhase === "playing" || state.gamePhase === "countdown") {
      switchToGameplayMusic()
    } else if (state.gamePhase === "lobby") {
      switchToLobbyMusic()
    }
    // Game over keeps gameplay music (podium)
  }, [state.gamePhase])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // Note: QuizScreen calls this callback but we no longer use it to control turn flow.
  // Turn completion is now handled by notification dismissal.
  const handleDiceRoll = useCallback((_value: number | null, _isRolling: boolean, _rolls?: number[]) => {
    // The store now manages dice state and view transitions.
    // Do NOT call completeTurn here - it happens too early.
    // completeTurn is called when the last notification is dismissed.
  }, [])

  const handleAnswer = useCallback(async (questionIndex: number, answerIndex: number) => {
    game.submitAnswer(questionIndex, answerIndex)
  }, [game])

  const handleNextQuestion = useCallback(async (wasCorrect: boolean): Promise<{ dieRoll: number | null; tileEvent: EventCardData | null }> => {
    const result = await game.advanceQuestion(wasCorrect)
    return {
      dieRoll: result.dieRoll,
      tileEvent: result.tileEvent ? {
        tileName: result.tileEvent.tileName,
        tileText: result.tileEvent.tileText,
        coinsDelta: result.tileEvent.coinsDelta,
        isGlobal: result.tileEvent.isGlobal || false,
      } : null,
    }
  }, [game])

  const handlePlayAgain = useCallback(() => {
    if (state.isHost) {
      game.resetGame()
    }
    game.leaveRoom()
  }, [game, state.isHost])

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  /** Render the active notification based on type */
  const renderNotification = () => {
    const notification = state.activeNotification
    if (!notification) return null

    switch (notification.type) {
      case "tile_event":
        return (
          <EventCard
            event={{
              tileName: notification.data.tileName,
              tileText: notification.data.tileText,
              coinsDelta: notification.data.coinsDelta,
              isGlobal: notification.data.isGlobal || false,
            }}
            onDismiss={game.dismissNotification}
          />
        )

      case "lap_bonus":
        return (
          <LapBonusToast
            data={notification.data}
            onDismiss={game.dismissNotification}
          />
        )

      case "heist_result":
        return (
          <GameEventToast
            heistResult={notification.data}
            myPlayerName={state.myPlayer?.name}
            onDismiss={game.dismissNotification}
          />
        )

      case "ponzi_result": {
        const ponzi = notification.data
        const won = ponzi.won === true
        const coinsChange = ponzi.coinsChange || 0
        
        // Build the event card data based on ponzi result
        let tileText: string
        if (!ponzi.invested) {
          tileText = "You played it safe and walked away."
        } else if (won) {
          tileText = `🎰 JACKPOT! You doubled your bet and won ${coinsChange} coins!`
        } else {
          tileText = `💸 Ouch! The scheme collapsed and you lost ${Math.abs(coinsChange)} coins!`
        }
        
        return (
          <EventCard
            event={{
              tileName: won ? "🎉 Ponzi Scheme - WIN!" : ponzi.invested ? "💔 Ponzi Scheme - LOSS" : "Ponzi Scheme",
              tileText,
              coinsDelta: coinsChange,
              isGlobal: false,
            }}
            onDismiss={game.dismissNotification}
          />
        )
      }

      case "police_result":
        return (
          <GameEventToast
            policeResult={notification.data}
            myPlayerName={state.myPlayer?.name}
            onDismiss={game.dismissNotification}
          />
        )

      case "swap_meet_result": {
        const swap = notification.data
        const isTarget = notification.isTarget
        
        // Handle skipped swap (no target selected)
        if (!swap.targetId) {
          return (
            <EventCard
              event={{
                tileName: "🔄 Swap Meet - Skipped",
                tileText: "You decided to keep your coins. Wise choice... or was it?",
                coinsDelta: 0,
                isGlobal: false,
              }}
              onDismiss={game.dismissNotification}
            />
          )
        }
        
        const myOldCoins = isTarget ? swap.targetOldCoins : swap.swapperOldCoins
        const myNewCoins = isTarget ? swap.targetNewCoins : swap.swapperNewCoins
        const otherName = isTarget ? swap.swapperName : swap.targetName
        const diff = myNewCoins - myOldCoins
        
        return (
          <EventCard
            event={{
              tileName: diff >= 0 ? "🔄 Swap Meet - Gain!" : "🔄 Swap Meet - Loss!",
              tileText: isTarget 
                ? `${swap.swapperName} swapped coins with you! You ${diff >= 0 ? 'gained' : 'lost'} ${Math.abs(diff)} coins.`
                : `You swapped coins with ${otherName}! You ${diff >= 0 ? 'gained' : 'lost'} ${Math.abs(diff)} coins.`,
              coinsDelta: diff,
              isGlobal: false,
            }}
            onDismiss={game.dismissNotification}
          />
        )
      }

      case "identity_theft":
        return (
          <IdentityTheftModal
            data={notification.data}
            myPlayerName={state.myPlayer?.name}
            onDismiss={game.dismissNotification}
          />
        )

      case "impact_toast":
        return <ImpactToast {...notification.data} onDismiss={game.dismissNotification} />

      default:
        return null
    }
  }

  /** Render the pending interaction modal */
  const renderInteraction = () => {
    const interaction = state.pendingInteraction
    if (!interaction) return null

    // TypeScript discriminated union - type narrowing works here
    if (interaction.type === "heist") {
      return (
        <HeistModal
          data={interaction.data}
          onSelectTarget={game.selectHeistTarget}
        />
      )
    }

    if (interaction.type === "ponzi") {
      return (
        <PonziModal
          data={interaction.data}
          onChoice={game.makePonziChoice}
        />
      )
    }

    if (interaction.type === "police") {
      return (
        <PoliceModal
          data={interaction.data}
          onSelectTarget={game.selectPoliceTarget}
        />
      )
    }

    if (interaction.type === "swap_meet") {
      return (
        <SwapMeetModal
          data={interaction.data}
          onSelectTarget={game.selectSwapMeetTarget}
        />
      )
    }

    return null
  }

  // ============================================================================
  // RENDER VIEWS
  // ============================================================================

  // Lobby view
  if (state.gamePhase === "lobby") {
    return (
      <RoomLobby
        roomState={{
          roomCode: state.roomCode,
          role: state.isHost ? "host" : "guest",
          connectionState: state.connectionStatus,
          players: state.allPlayers,
          gameStarted: false,
        }}
        myPlayer={state.myPlayer}
        onCreateRoom={game.createRoom}
        onJoinRoom={game.joinRoom}
        onStartGame={game.startGame}
        onLeaveRoom={game.leaveRoom}
      />
    )
  }

  // Game over view
  const allPlayersComplete = state.allPlayers.length > 0 && 
    state.allPlayers.every(p => p.currentQuestionIndex >= QUESTIONS.length)
  
  if (allPlayersComplete) {
    return <GameOver players={state.allPlayers} onPlayAgain={handlePlayAgain} />
  }

  // Loading state
  if (!state.myPlayer || !state.myPlayerId) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-emerald-700 text-lg font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // Main game view
  const isQuizActive = state.activeView === "quiz" && 
    !state.pendingInteraction && 
    !state.activeNotification && 
    state.gamePhase !== "countdown"

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-200 overflow-hidden">
      {/* Decorative clouds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-10 w-64 h-32 bg-white rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-48 h-24 bg-white rounded-full blur-3xl" />
      </div>

      {/* Room code indicator */}
      <div className="absolute top-1 right-1 z-20 bg-[#FAF8F0] px-3 py-1.5 rounded-lg shadow-lg border-2 border-amber-300">
        <span className="text-xs text-amber-700 font-medium">Room: </span>
        <span className="text-sm font-mono font-bold text-green-700">{state.roomCode}</span>
      </div>

      {/* BGM toggle */}
      <button
        onClick={() => setBgmPlaying(toggleBGM())}
        className={`
          absolute bottom-3 left-3 z-20 
          px-3 py-2 rounded-xl shadow-lg border-2 
          transition-all hover:scale-105 flex items-center gap-2
          ${bgmPlaying 
            ? "bg-green-100 border-green-400 hover:bg-green-50" 
            : "bg-[#FAF8F0] border-amber-300 hover:bg-white"}
        `}
      >
        <span className="text-lg">{bgmPlaying ? "🎵" : "🔇"}</span>
        <span className={`font-semibold text-xs ${bgmPlaying ? "text-green-700" : "text-amber-800"}`}>
          {bgmPlaying ? "On" : "Off"}
        </span>
      </button>

      {/* View toggle button */}
      <button
        onClick={() => game.setView(state.activeView === "quiz" ? "board" : "quiz")}
        className="absolute top-5 left-[37.5%] -translate-x-1/2 z-20 bg-[#FAF8F0] hover:bg-white px-5 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg border-2 border-amber-300"
      >
        <span className="text-lg">{state.activeView === "quiz" ? "🎮" : "❓"}</span>
        <span className="text-sm text-amber-800 font-semibold">
          {state.activeView === "quiz" ? "View Board" : "View Quiz"}
        </span>
      </button>

      {/* Board View */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
          state.activeView === "board" 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="h-full w-full flex gap-3 p-3">
          <div className="h-full relative rounded-2xl overflow-hidden" style={{ width: "75%" }}>
            <Board 
              players={state.allPlayers} 
              currentPlayerId={state.myPlayerId}
            />

            {/* Flying Coins */}
            {state.flyingCoins && (
              <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <FlyingCoins
                  fromPlayerId={state.flyingCoins.fromPlayerId}
                  toPlayerId={state.flyingCoins.toPlayerId}
                  amount={state.flyingCoins.amount}
                  players={state.allPlayers}
                  onComplete={game.stopFlyingCoins}
                />
              </div>
            )}

            {/* Dice overlay */}
            {state.diceValue !== null && (
              <div className="absolute inset-0 bg-green-900/70 backdrop-blur-sm z-30 flex items-center justify-center rounded-2xl">
                <div className="text-center bg-[#FAF8F0] rounded-2xl p-8 shadow-2xl border-4 border-amber-700/80">
                  <DiceRoller value={state.diceValue} isRolling={state.isDiceRolling} />
                  {!state.isDiceRolling && (
                    <p className="text-green-700 mt-4 text-lg font-bold animate-bounce-in">
                      Moving {state.diceValue} {state.diceValue === 1 ? "space" : "spaces"}!
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Countdown overlay */}
            {state.gamePhase === "countdown" && (
              <div className="absolute inset-0 bg-green-900/70 backdrop-blur-sm z-40 flex items-center justify-center rounded-2xl">
                <GameCountdown onComplete={game.onCountdownComplete} />
              </div>
            )}
          </div>

          <div className="h-full" style={{ width: "25%" }}>
            <Leaderboard players={state.allPlayers} />
          </div>
        </div>
      </div>

      {/* Quiz View */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
          state.activeView === "quiz" 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="h-full w-full flex gap-3 p-3">
          <div className="h-full" style={{ width: "75%" }}>
            <div className="h-full bg-[#FAF8F0] border-4 border-amber-700/80 rounded-2xl p-6 overflow-hidden shadow-xl">
              <QuizScreen
                player={state.myPlayer}
                onAnswer={handleAnswer}
                onNextQuestion={handleNextQuestion}
                onDiceRoll={handleDiceRoll}
                isActive={isQuizActive}
              />
            </div>
          </div>

          <div className="h-full" style={{ width: "25%" }}>
            <Leaderboard players={state.allPlayers} />
          </div>
        </div>
      </div>

      {/* Modals and Notifications */}
      {renderInteraction()}
      {renderNotification()}
    </div>
  )
}

/** Small toast for impact notifications */
function ImpactToast({ 
  message, 
  coinsDelta, 
  onDismiss 
}: { 
  message: string
  coinsDelta: number
  triggeredBy: string
  onDismiss: () => void 
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 animate-bounce-in">
      <div className={`
        px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm text-sm font-medium
        ${coinsDelta >= 0 
          ? "bg-green-100/95 border-2 border-green-400 text-green-800" 
          : "bg-red-100/95 border-2 border-red-400 text-red-800"}
      `}>
        {message}{coinsDelta !== 0 && ` ${coinsDelta >= 0 ? '+' : ''}${coinsDelta} 🪙`}
      </div>
    </div>
  )
}
