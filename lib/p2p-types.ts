/**
 * P2P Types - Type definitions for the peer-to-peer game communication
 * 
 * This file defines all the message types and data structures used for
 * communication between the host (who runs the game engine) and guests.
 */

import type { Player } from "./types"

// ============================================================================
// CONNECTION & ROOM STATE
// ============================================================================

/** Connection state for a peer */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "error"

/** Role in the game room - host runs the game engine, guests send actions */
export type RoomRole = "host" | "guest"

/** Current state of a game room */
export interface RoomState {
  roomCode: string
  role: RoomRole
  connectionState: ConnectionState
  players: Player[]
  gameStarted: boolean
  hostName?: string
}

// ============================================================================
// TILE EVENT DATA
// ============================================================================

/**
 * Data about a tile event that occurred
 * This is sent to players to display the effect of landing on a tile
 */
export interface TileEventData {
  tileName: string
  tileText: string
  coinsDelta: number
  /** If true, this event affects multiple players (e.g., party_time, tax_collector) */
  isGlobal?: boolean
  /** 
   * Players impacted by this global event (excluding the triggering player)
   * Only populated for global events
   */
  impactedPlayers?: {
    id: string
    name: string
    coinsDelta: number
    /** If true, the victim should see a prominent modal (e.g., swap_meet) */
    isBigEvent?: boolean
  }[]
  /**
   * If true, a coin swap already happened this turn (swap_meet effect)
   * Used to prevent identity theft from doing another swap
   */
  swapOccurred?: boolean
}

// ============================================================================
// INTERACTIVE PROMPT DATA (shown to the active player)
// ============================================================================

/** Heist prompt - player chooses who to steal from */
export interface HeistPromptData {
  type: "10" | "100" | "50" // percentage or fixed amount to steal
  availableTargets: { id: string; name: string; coins: number }[]
}

/** Ponzi/Gamble prompt - player chooses to gamble or skip */
export interface PonziPromptData {
  currentCoins: number
}

/** Police station prompt - player chooses who to report */
export interface PolicePromptData {
  availableTargets: { id: string; name: string; coins: number }[]
}

/** Swap meet prompt - player chooses who to swap coins with */
export interface SwapMeetPromptData {
  currentCoins: number
  availableTargets: { id: string; name: string; coins: number }[]
}

// ============================================================================
// RESULT DATA (shown after actions complete)
// ============================================================================

/** Result of a heist action */
export interface HeistResultData {
  thiefId: string
  thiefName: string
  victimId: string
  victimName: string
  amountStolen: number
}

/** Result of a ponzi/gamble action */
export interface PonziResultData {
  playerId: string
  playerName: string
  invested: boolean
  won?: boolean
  coinsChange?: number
}

/** Result of a police report action */
export interface PoliceResultData {
  snitchId: string
  snitchName: string
  victimId: string
  victimName: string
  coinsLost: number
}

/** Result of a swap meet action */
export interface SwapMeetResultData {
  swapperId: string
  swapperName: string
  targetId: string
  targetName: string
  swapperOldCoins: number
  targetOldCoins: number
  swapperNewCoins: number
  targetNewCoins: number
}

/** Result of an identity theft event (coin swap between players on same tile) */
export interface IdentityTheftResultData {
  player1Id: string
  player1Name: string
  player2Id: string
  player2Name: string
  player1OldCoins: number
  player2OldCoins: number
  player1NewCoins: number
  player2NewCoins: number
}

// ============================================================================
// GUEST TO HOST MESSAGES
// ============================================================================

export type GuestToHostMessage =
  | { type: "JOIN_REQUEST"; playerName: string }
  | { type: "SUBMIT_ANSWER"; playerId: string; questionIndex: number; answerIndex: number }
  | { type: "NEXT_QUESTION"; playerId: string; wasCorrect: boolean }
  | { type: "HEIST_TARGET_SELECTED"; playerId: string; targetPlayerId: string }
  | { type: "PONZI_CHOICE"; playerId: string; invest: boolean; spinResult?: boolean }
  | { type: "POLICE_TARGET_SELECTED"; playerId: string; targetPlayerId: string }
  | { type: "SWAP_MEET_TARGET_SELECTED"; playerId: string; targetPlayerId: string }
  | { type: "LEAVE_GAME"; playerId: string }

// ============================================================================
// HOST TO GUEST MESSAGES
// ============================================================================

export type HostToGuestMessage =
  // Room management
  | { type: "JOIN_ACCEPTED"; playerId: string; player: Player; allPlayers: Player[] }
  | { type: "JOIN_REJECTED"; reason: string }
  | { type: "PLAYER_JOINED"; player: Player; allPlayers: Player[] }
  | { type: "PLAYER_LEFT"; playerId: string; playerName: string; allPlayers: Player[] }
  | { type: "GAME_STARTED"; allPlayers: Player[] }
  | { type: "STATE_UPDATE"; allPlayers: Player[] }
  // Game actions
  | {
      type: "ANSWER_RESULT"
      playerId: string
      correct: boolean
      newCoins: number
      allPlayers: Player[]
    }
  | {
      type: "MOVE_RESULT"
      playerId: string
      playerName: string
      dieRoll: number | null
      dieRolls: number[]
      lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
      tileEvent: TileEventData | null
      allPlayers: Player[]
    }
  // Interactive prompts (only sent to the relevant player)
  | { type: "HEIST_PROMPT"; playerId: string; heistData: HeistPromptData }
  | { type: "PONZI_PROMPT"; playerId: string; ponziData: PonziPromptData }
  | { type: "POLICE_PROMPT"; playerId: string; policeData: PolicePromptData }
  | { type: "SWAP_MEET_PROMPT"; playerId: string; swapMeetData: SwapMeetPromptData }
  // Action results
  | { type: "HEIST_RESULT"; result: HeistResultData; allPlayers: Player[] }
  | { type: "PONZI_RESULT"; result: PonziResultData; allPlayers: Player[] }
  | { type: "POLICE_RESULT"; result: PoliceResultData; allPlayers: Player[] }
  | { type: "SWAP_MEET_RESULT"; result: SwapMeetResultData; allPlayers: Player[] }
  | { type: "IDENTITY_THEFT_EVENT"; result: IdentityTheftResultData; allPlayers: Player[] }
  // Game lifecycle
  | { type: "GAME_RESET" }
  | { type: "HOST_DISCONNECTED" }

export type P2PMessage = GuestToHostMessage | HostToGuestMessage

// ============================================================================
// GAME ENGINE STATE (host only)
// ============================================================================

/** Internal state for the game engine running on the host */
export interface GameEngineState {
  players: Map<string, Player>
  gameStarted: boolean
  /** Pending heist - player must select a target */
  pendingHeist?: {
    playerId: string
    type: "10" | "100" | "50"
  }
  /** Pending ponzi - player must choose to invest or skip */
  pendingPonzi?: {
    playerId: string
  }
  /** Pending police action - player must select who to report */
  pendingPolice?: {
    playerId: string
  }
  /** Pending swap meet - player must select who to swap coins with */
  pendingSwapMeet?: {
    playerId: string
  }
}
