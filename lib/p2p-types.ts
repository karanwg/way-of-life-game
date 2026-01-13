import type { Player } from "./types"

// Room and connection state
export type ConnectionState = "disconnected" | "connecting" | "connected" | "error"

export type RoomRole = "host" | "guest"

export interface RoomState {
  roomCode: string
  role: RoomRole
  connectionState: ConnectionState
  players: Player[]
  gameStarted: boolean
  hostName?: string
}

// Messages sent from guest to host
export type GuestToHostMessage =
  | { type: "JOIN_REQUEST"; playerName: string }
  | { type: "SUBMIT_ANSWER"; playerId: string; questionIndex: number; answerIndex: number }
  | { type: "NEXT_QUESTION"; playerId: string; wasCorrect: boolean }
  | { type: "LEAVE_GAME"; playerId: string }

// Messages sent from host to guests
export type HostToGuestMessage =
  | { type: "JOIN_ACCEPTED"; playerId: string; player: Player; allPlayers: Player[] }
  | { type: "JOIN_REJECTED"; reason: string }
  | { type: "PLAYER_JOINED"; player: Player; allPlayers: Player[] }
  | { type: "PLAYER_LEFT"; playerId: string; allPlayers: Player[] }
  | { type: "GAME_STARTED"; allPlayers: Player[] }
  | { type: "STATE_UPDATE"; allPlayers: Player[] }
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
      dieRoll: number | null
      tileEvent: { tileName: string; tileText: string; coinsDelta: number; isGlobal: boolean } | null
      lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
      allPlayers: Player[]
    }
  | { type: "GAME_RESET" }
  | { type: "HOST_DISCONNECTED" }

export type P2PMessage = GuestToHostMessage | HostToGuestMessage

// Game engine state (for host)
export interface GameEngineState {
  players: Map<string, Player>
  gameStarted: boolean
}
