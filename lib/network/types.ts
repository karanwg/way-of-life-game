/**
 * Network Types - Shared types for P2P communication
 * 
 * This module defines the contract between host and guest,
 * and the events that flow between them.
 */

import type { Player } from "../types"
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
} from "../p2p-types"

// ============================================================================
// NETWORK EVENTS - Events that flow from network to UI
// ============================================================================

export type NetworkEvent =
  // Connection events
  | { type: "connected"; roomCode: string }
  | { type: "disconnected" }
  | { type: "error"; message: string }
  | { type: "player_joined"; playerId: string; player: Player; allPlayers: Player[] }
  | { type: "player_left"; playerId: string; allPlayers: Player[] }
  
  // Game lifecycle
  | { type: "game_started"; allPlayers: Player[] }
  | { type: "game_reset" }
  | { type: "host_disconnected" }
  
  // My identity
  | { type: "identity_assigned"; playerId: string; player: Player; allPlayers: Player[] }
  
  // Game updates
  | { type: "players_updated"; allPlayers: Player[] }
  | { type: "answer_result"; playerId: string; correct: boolean; newCoins: number; allPlayers: Player[] }
  | { 
      type: "move_result"
      playerId: string
      playerName: string
      dieRoll: number | null
      dieRolls: number[]
      lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
      tileEvent: TileEventData | null
      allPlayers: Player[]
    }
  
  // Interactive prompts (only for the player who needs to act)
  | { type: "heist_prompt"; data: HeistPromptData }
  | { type: "ponzi_prompt"; data: PonziPromptData }
  | { type: "police_prompt"; data: PolicePromptData }
  | { type: "swap_meet_prompt"; data: SwapMeetPromptData }
  
  // Results (only for involved players)
  | { type: "heist_result"; data: HeistResultData; isVictim: boolean; allPlayers: Player[] }
  | { type: "ponzi_result"; data: PonziResultData; allPlayers: Player[] }
  | { type: "police_result"; data: PoliceResultData; isVictim: boolean; allPlayers: Player[] }
  | { type: "swap_meet_result"; data: SwapMeetResultData; isTarget: boolean; allPlayers: Player[] }
  | { type: "identity_theft"; data: IdentityTheftResultData; allPlayers: Player[] }
  
  // Impact from others' actions (for global events)
  | { 
      type: "impacted_by_event"
      tileName: string
      coinsDelta: number
      isBigEvent: boolean
      triggeredByName: string
    }

// ============================================================================
// NETWORK INTERFACE - What the network layer provides
// ============================================================================

export interface NetworkInterface {
  // Connection management
  connect(): void
  disconnect(): void
  
  // Game actions (called by UI)
  submitAnswer(questionIndex: number, answerIndex: number): void
  advanceQuestion(wasCorrect: boolean): Promise<MoveResultForNetwork>
  selectHeistTarget(targetId: string): void
  makePonziChoice(invest: boolean, spinResult?: boolean): void
  selectPoliceTarget(targetId: string): void
  
  // Host-only actions
  startGame?(): void
}

export interface MoveResultForNetwork {
  dieRoll: number | null
  dieRolls: number[]
  lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
  tileEvent: TileEventData | null
  heistPrompt?: HeistPromptData
  ponziPrompt?: PonziPromptData
  policePrompt?: PolicePromptData
  swapMeetPrompt?: SwapMeetPromptData
  identityTheftEvent?: IdentityTheftResultData
}

// ============================================================================
// PEER CONFIGURATION
// ============================================================================

export const PEER_CONFIG = {
  host: 'peer-server-wg.up.railway.app',
  port: 443,
  path: '/',
  key: 'peerjs',
  secure: true,
}

export function roomCodeToPeerId(code: string): string {
  return `wayoflife-${code.toUpperCase()}`
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
