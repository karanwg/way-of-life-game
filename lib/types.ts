/**
 * Core Type Definitions
 * 
 * This module contains the fundamental types used throughout the game.
 */

/**
 * Player - Represents a player in the game
 * 
 * This is the core player state that is synchronized across all clients.
 * The host maintains the authoritative copy and broadcasts updates.
 */
export type Player = {
  /** Unique player identifier (generated when joining) */
  id: string
  /** Display name chosen by player */
  name: string
  /** Current coin balance (can be negative) */
  coins: number
  /** Current question index (0 to QUESTIONS.length) */
  currentQuestionIndex: number
  /** Whether player has answered current question */
  answered: boolean
  /** Index of selected answer (null if not answered) */
  selectedAnswer: number | null
  /** Current tile position (0-23) */
  currentTileId: number
  /** Number of completed laps around the board */
  lapsCompleted: number
}

/**
 * Question - Quiz question structure
 */
export type Question = {
  /** Unique question ID */
  id: number
  /** The question text */
  question: string
  /** Array of 4 possible answers */
  options: string[]
  /** Index of the correct answer (0-3) */
  correctAnswerIndex: number
}

/**
 * GameEvent - Events that can be broadcast to update game state
 * (Legacy - primarily used for type reference)
 */
export type GameEvent =
  | { type: "PLAYER_JOINED"; player: Player }
  | { type: "QUESTION_ANSWERED"; playerId: string; correct: boolean; newCoins: number }
  | { type: "GAME_RESET" }
  | { type: "GAME_STATE_UPDATE"; players: Player[] }
  | { type: "TILE_LANDED"; playerId: string; tileName: string; tileText: string; coinsDelta: number }

/**
 * GameState - Overall game state container
 * (Legacy - game engine uses its own state type)
 */
export type GameState = {
  players: Map<string, Player>
}
