/**
 * useGameStore - React hook for game state management
 * 
 * This hook provides:
 * - Access to the centralized game state
 * - Dispatch function for state updates
 * - Derived state and selectors
 * - Automatic re-renders on state changes
 * 
 * USAGE:
 * const { state, dispatch, canAnswer } = useGameStore()
 */

"use client"

import { useReducer, useCallback, useMemo } from "react"
import {
  type GameState,
  type GameAction,
  type NotificationType,
  initialGameState,
  gameReducer,
  canAnswer as canAnswerSelector,
  hasBlockingUI as hasBlockingUISelector,
  isGameComplete as isGameCompleteSelector,
  getMyRank as getMyRankSelector,
} from "@/lib/game-store"
import { QUESTIONS } from "@/lib/questions"
import type { Player } from "@/lib/types"

const TOTAL_QUESTIONS = QUESTIONS.length

export function useGameStore() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState)

  // ============================================================================
  // DERIVED STATE (memoized selectors)
  // ============================================================================
  
  const canAnswer = useMemo(() => canAnswerSelector(state), [state])
  const hasBlockingUI = useMemo(() => hasBlockingUISelector(state), [state])
  const isGameComplete = useMemo(() => isGameCompleteSelector(state, TOTAL_QUESTIONS), [state])
  const myRank = useMemo(() => getMyRankSelector(state), [state])

  // ============================================================================
  // ACTION DISPATCHERS (convenience functions)
  // ============================================================================

  /** Update connection status */
  const setConnection = useCallback((
    status: GameState["connectionStatus"],
    roomCode?: string,
    isHost?: boolean
  ) => {
    dispatch({ type: "SET_CONNECTION", status, roomCode, isHost })
  }, [])

  /** Set the current player */
  const setMyPlayer = useCallback((playerId: string, player: Player) => {
    dispatch({ type: "SET_MY_PLAYER", playerId, player })
  }, [])

  /** Update all players list */
  const updatePlayers = useCallback((players: Player[]) => {
    dispatch({ type: "UPDATE_PLAYERS", players })
  }, [])

  /** Start the game (triggers countdown) */
  const startGame = useCallback(() => {
    dispatch({ type: "START_GAME" })
  }, [])

  /** Called when countdown finishes */
  const onCountdownComplete = useCallback(() => {
    dispatch({ type: "COUNTDOWN_COMPLETE" })
  }, [])

  /** Reset to initial state */
  const resetGame = useCallback(() => {
    dispatch({ type: "RESET_GAME" })
  }, [])

  /** Start the dice roll animation */
  const startDiceRoll = useCallback((value: number, rolls: number[]) => {
    dispatch({ type: "START_DICE_ROLL", value, rolls })
  }, [])

  /** Called when dice animation completes */
  const onDiceRollComplete = useCallback(() => {
    dispatch({ type: "DICE_ROLL_COMPLETE" })
  }, [])

  /** Clear dice overlay (without changing view) */
  const clearDice = useCallback(() => {
    dispatch({ type: "CLEAR_DICE" })
  }, [])

  /** Called when pawn movement animation completes */
  const onMovementComplete = useCallback(() => {
    dispatch({ type: "MOVEMENT_COMPLETE" })
  }, [])

  /** Complete the current turn and return to quiz */
  const completeTurn = useCallback(() => {
    dispatch({ type: "TURN_COMPLETE" })
  }, [])

  /** Show a notification immediately */
  const showNotification = useCallback((notification: NotificationType) => {
    dispatch({ type: "SHOW_NOTIFICATION", notification })
  }, [])

  /** Queue a notification (shown after pending interaction completes) */
  const queueNotification = useCallback((notification: NotificationType) => {
    dispatch({ type: "QUEUE_NOTIFICATION", notification })
  }, [])

  /** Dismiss current notification */
  const dismissNotification = useCallback(() => {
    dispatch({ type: "DISMISS_NOTIFICATION" })
  }, [])

  /** Process notification queue (call after clearing pending interaction) */
  const processNotificationQueue = useCallback(() => {
    dispatch({ type: "PROCESS_NOTIFICATION_QUEUE" })
  }, [])

  /** Set pending interaction (heist/ponzi/police/swap_meet) */
  const setPendingInteraction = useCallback((
    type: "heist" | "ponzi" | "police" | "swap_meet",
    data: import("@/lib/p2p-types").HeistPromptData | import("@/lib/p2p-types").PonziPromptData | import("@/lib/p2p-types").PolicePromptData | import("@/lib/p2p-types").SwapMeetPromptData
  ) => {
    dispatch({ type: "SET_PENDING_INTERACTION", interaction: { type, data } as GameState["pendingInteraction"] })
  }, [])

  /** Clear pending interaction */
  const clearPendingInteraction = useCallback(() => {
    dispatch({ type: "CLEAR_PENDING_INTERACTION" })
  }, [])

  /** Switch active view */
  const setView = useCallback((view: "quiz" | "board") => {
    dispatch({ type: "SET_VIEW", view })
  }, [])

  /** Start flying coins animation */
  const startFlyingCoins = useCallback((
    fromPlayerId: string,
    toPlayerId: string,
    amount: number
  ) => {
    dispatch({ type: "START_FLYING_COINS", fromPlayerId, toPlayerId, amount })
  }, [])

  /** Stop flying coins animation */
  const stopFlyingCoins = useCallback(() => {
    dispatch({ type: "STOP_FLYING_COINS" })
  }, [])

  return {
    // State
    state,
    dispatch,
    
    // Derived state
    canAnswer,
    hasBlockingUI,
    isGameComplete,
    myRank,
    
    // Actions
    setConnection,
    setMyPlayer,
    updatePlayers,
    startGame,
    onCountdownComplete,
    resetGame,
    startDiceRoll,
    onDiceRollComplete,
    clearDice,
    onMovementComplete,
    completeTurn,
    showNotification,
    queueNotification,
    dismissNotification,
    processNotificationQueue,
    setPendingInteraction,
    clearPendingInteraction,
    setView,
    startFlyingCoins,
    stopFlyingCoins,
  }
}

export type GameStoreReturn = ReturnType<typeof useGameStore>
