/**
 * GameStore - Centralized game state management
 * 
 * This module provides a clean state machine for the game with:
 * - Clear game phases (lobby, playing, game_over)
 * - Turn phases (answering, rolling, moving, resolving_effect, waiting)
 * - Unified notification queue
 * - Single source of truth for all game state
 * 
 * ARCHITECTURE:
 * - GameStore is a singleton that holds all game state
 * - Components subscribe to state changes
 * - Actions are dispatched to update state
 * - State transitions are validated by the state machine
 */

import type { Player } from "./types"
import type {
  TileEventData,
  HeistPromptData,
  HeistResultData,
  PonziPromptData,
  PonziResultData,
  PolicePromptData,
  PoliceResultData,
  SwapMeetPromptData,
  SwapMeetResultData,
  IdentityTheftResultData,
} from "./p2p-types"

// ============================================================================
// GAME PHASES - High level game state
// ============================================================================

export type GamePhase = "lobby" | "countdown" | "playing" | "game_over"

// ============================================================================
// TURN PHASES - State during a player's turn
// ============================================================================

export type TurnPhase =
  | "idle"                  // Waiting for turn or between questions
  | "answering"             // Player is answering a question
  | "answered"              // Answer submitted, showing feedback
  | "rolling"               // Dice is rolling (correct answer)
  | "moving"                // Pawn is animating
  | "resolving_tile"        // Tile effect is being shown/resolved
  | "awaiting_interaction"  // Waiting for player to interact (heist/ponzi/police)
  | "showing_result"        // Showing result of interaction

// ============================================================================
// NOTIFICATION TYPES
// These are passive notifications that display information to the user.
// Interactive prompts (heist/ponzi/police) are handled via pendingInteraction.
// ============================================================================

export type NotificationType =
  | { type: "tile_event"; data: TileEventData }
  | { type: "lap_bonus"; data: { lapsCompleted: number; coinsAwarded: number } }
  | { type: "heist_result"; data: HeistResultData; isVictim: boolean }
  | { type: "ponzi_result"; data: PonziResultData }
  | { type: "police_result"; data: PoliceResultData; isVictim: boolean }
  | { type: "swap_meet_result"; data: SwapMeetResultData; isTarget: boolean }
  | { type: "identity_theft"; data: IdentityTheftResultData }
  | { type: "impact_toast"; data: { message: string; coinsDelta: number; triggeredBy: string } }

// ============================================================================
// GAME STATE
// ============================================================================

export interface GameState {
  // Connection state
  roomCode: string
  isHost: boolean
  connectionStatus: "disconnected" | "connecting" | "connected" | "error"
  
  // Player state
  myPlayerId: string | null
  myPlayer: Player | null
  allPlayers: Player[]
  
  // Game phase
  gamePhase: GamePhase
  turnPhase: TurnPhase
  
  // Dice state
  diceValue: number | null
  diceRolls: number[]
  isDiceRolling: boolean
  
  // Active view
  activeView: "quiz" | "board"
  
  // Current notification (only one at a time)
  activeNotification: NotificationType | null
  
  // Queued notifications (shown after pending interaction completes)
  notificationQueue: NotificationType[]
  
  // Pending interaction (blocks turn progression)
  pendingInteraction: 
    | { type: "heist"; data: HeistPromptData }
    | { type: "ponzi"; data: PonziPromptData }
    | { type: "police"; data: PolicePromptData }
    | { type: "swap_meet"; data: SwapMeetPromptData }
    | null
  
  // Flying coins animation
  flyingCoins: {
    fromPlayerId: string
    toPlayerId: string
    amount: number
  } | null
}

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialGameState: GameState = {
  roomCode: "",
  isHost: false,
  connectionStatus: "disconnected",
  myPlayerId: null,
  myPlayer: null,
  allPlayers: [],
  gamePhase: "lobby",
  turnPhase: "idle",
  diceValue: null,
  diceRolls: [],
  isDiceRolling: false,
  activeView: "quiz",
  activeNotification: null,
  notificationQueue: [],
  pendingInteraction: null,
  flyingCoins: null,
}

// ============================================================================
// ACTIONS
// ============================================================================

export type GameAction =
  // Connection actions
  | { type: "SET_CONNECTION"; status: GameState["connectionStatus"]; roomCode?: string; isHost?: boolean }
  | { type: "SET_MY_PLAYER"; playerId: string; player: Player }
  | { type: "UPDATE_PLAYERS"; players: Player[] }
  
  // Game lifecycle
  | { type: "START_GAME" }
  | { type: "START_COUNTDOWN" }
  | { type: "COUNTDOWN_COMPLETE" }
  | { type: "GAME_OVER" }
  | { type: "RESET_GAME" }
  
  // Turn flow
  | { type: "START_ANSWERING" }
  | { type: "SUBMIT_ANSWER"; correct: boolean }
  | { type: "START_DICE_ROLL"; value: number; rolls: number[] }
  | { type: "DICE_ROLL_COMPLETE" }
  | { type: "CLEAR_DICE" }
  | { type: "START_MOVING" }
  | { type: "MOVEMENT_COMPLETE" }
  | { type: "TURN_COMPLETE" }
  
  // Notifications
  | { type: "SHOW_NOTIFICATION"; notification: NotificationType }
  | { type: "QUEUE_NOTIFICATION"; notification: NotificationType }
  | { type: "DISMISS_NOTIFICATION" }
  | { type: "PROCESS_NOTIFICATION_QUEUE" }
  
  // Interactions
  | { type: "SET_PENDING_INTERACTION"; interaction: GameState["pendingInteraction"] }
  | { type: "CLEAR_PENDING_INTERACTION" }
  
  // View
  | { type: "SET_VIEW"; view: "quiz" | "board" }
  
  // Animations
  | { type: "START_FLYING_COINS"; fromPlayerId: string; toPlayerId: string; amount: number }
  | { type: "STOP_FLYING_COINS" }

// ============================================================================
// REDUCER
// ============================================================================

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // Connection actions
    case "SET_CONNECTION":
      return {
        ...state,
        connectionStatus: action.status,
        roomCode: action.roomCode ?? state.roomCode,
        isHost: action.isHost ?? state.isHost,
      }
    
    case "SET_MY_PLAYER":
      return {
        ...state,
        myPlayerId: action.playerId,
        myPlayer: action.player,
      }
    
    case "UPDATE_PLAYERS": {
      const myPlayer = action.players.find(p => p.id === state.myPlayerId) ?? null
      return {
        ...state,
        allPlayers: action.players,
        myPlayer,
      }
    }
    
    // Game lifecycle
    case "START_GAME":
      return {
        ...state,
        gamePhase: "countdown",
        activeView: "board",
      }
    
    case "START_COUNTDOWN":
      return {
        ...state,
        gamePhase: "countdown",
        activeView: "board",
      }
    
    case "COUNTDOWN_COMPLETE":
      return {
        ...state,
        gamePhase: "playing",
        turnPhase: "answering",
        activeView: "quiz",
      }
    
    case "GAME_OVER":
      return {
        ...state,
        gamePhase: "game_over",
      }
    
    case "RESET_GAME":
      return {
        ...initialGameState,
        connectionStatus: state.connectionStatus,
        roomCode: state.roomCode,
        isHost: state.isHost,
      }
    
    // Turn flow
    case "START_ANSWERING":
      return {
        ...state,
        turnPhase: "answering",
      }
    
    case "SUBMIT_ANSWER":
      return {
        ...state,
        turnPhase: "answered",
      }
    
    case "START_DICE_ROLL":
      return {
        ...state,
        turnPhase: "rolling",
        diceValue: action.value,
        diceRolls: action.rolls,
        isDiceRolling: true,
        activeView: "board",
      }
    
    case "DICE_ROLL_COMPLETE":
      return {
        ...state,
        isDiceRolling: false,
        turnPhase: "moving",
      }
    
    case "CLEAR_DICE":
      return {
        ...state,
        diceValue: null,
        diceRolls: [],
        isDiceRolling: false,
      }
    
    case "START_MOVING":
      return {
        ...state,
        turnPhase: "moving",
      }
    
    case "MOVEMENT_COMPLETE":
      return {
        ...state,
        turnPhase: state.pendingInteraction ? "awaiting_interaction" : "resolving_tile",
      }
    
    case "TURN_COMPLETE":
      return {
        ...state,
        turnPhase: "idle",
        diceValue: null,
        diceRolls: [],
        isDiceRolling: false,
        activeView: "quiz",
        pendingInteraction: null,
      }
    
    // Notifications
    case "SHOW_NOTIFICATION":
      return {
        ...state,
        activeNotification: action.notification,
      }
    
    case "QUEUE_NOTIFICATION":
      return {
        ...state,
        notificationQueue: [...state.notificationQueue, action.notification],
      }
    
    case "DISMISS_NOTIFICATION": {
      // When dismissing, show next queued notification if any (and no pending interaction)
      const [nextNotification, ...remainingQueue] = state.notificationQueue
      if (nextNotification && !state.pendingInteraction) {
        return {
          ...state,
          activeNotification: nextNotification,
          notificationQueue: remainingQueue,
        }
      }
      return {
        ...state,
        activeNotification: null,
      }
    }
    
    case "PROCESS_NOTIFICATION_QUEUE": {
      // Show next queued notification if no active notification and no pending interaction
      if (state.activeNotification || state.pendingInteraction || state.notificationQueue.length === 0) {
        return state
      }
      const [nextNotification, ...remainingQueue] = state.notificationQueue
      return {
        ...state,
        activeNotification: nextNotification,
        notificationQueue: remainingQueue,
      }
    }
    
    // Interactions
    case "SET_PENDING_INTERACTION":
      return {
        ...state,
        pendingInteraction: action.interaction,
        turnPhase: "awaiting_interaction",
      }
    
    case "CLEAR_PENDING_INTERACTION": {
      // When clearing interaction, show next queued notification if any
      const [nextNotification, ...remainingQueue] = state.notificationQueue
      if (nextNotification && !state.activeNotification) {
        return {
          ...state,
          pendingInteraction: null,
          turnPhase: "showing_result",
          activeNotification: nextNotification,
          notificationQueue: remainingQueue,
        }
      }
      return {
        ...state,
        pendingInteraction: null,
        turnPhase: "showing_result",
      }
    }
    
    // View
    case "SET_VIEW":
      return {
        ...state,
        activeView: action.view,
      }
    
    // Animations
    case "START_FLYING_COINS":
      return {
        ...state,
        flyingCoins: {
          fromPlayerId: action.fromPlayerId,
          toPlayerId: action.toPlayerId,
          amount: action.amount,
        },
      }
    
    case "STOP_FLYING_COINS":
      return {
        ...state,
        flyingCoins: null,
      }
    
    default:
      return state
  }
}

// ============================================================================
// SELECTORS
// ============================================================================

/** Check if the current player can answer questions */
export function canAnswer(state: GameState): boolean {
  return (
    state.gamePhase === "playing" &&
    state.turnPhase === "answering" &&
    state.pendingInteraction === null &&
    state.activeNotification === null
  )
}

/** Check if there's any blocking UI (modal/prompt) */
export function hasBlockingUI(state: GameState): boolean {
  return (
    state.pendingInteraction !== null ||
    state.activeNotification !== null ||
    state.gamePhase === "countdown"
  )
}

/** Check if game is complete - uses provided question count */
export function isGameComplete(state: GameState, totalQuestions: number): boolean {
  if (state.allPlayers.length === 0) return false
  return state.allPlayers.every(p => p.currentQuestionIndex >= totalQuestions)
}

/** Get current player's rank (1-indexed) */
export function getMyRank(state: GameState): number {
  if (!state.myPlayerId) return 0
  const sorted = [...state.allPlayers].sort((a, b) => b.coins - a.coins)
  return sorted.findIndex(p => p.id === state.myPlayerId) + 1
}
