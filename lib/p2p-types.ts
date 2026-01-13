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

// Tile event that gets shown to the active player
export interface TileEventData {
  tileName: string
  tileText: string
  coinsDelta: number
}

// Heist prompt data - now includes heist type
export interface HeistPromptData {
  type: "10" | "100" | "50" // percentage or fixed amount
  availableTargets: { id: string; name: string; coins: number }[]
}

// Ponzi prompt data
export interface PonziPromptData {
  currentCoins: number
}

// Police station prompt data (snitch)
export interface PolicePromptData {
  availableTargets: { id: string; name: string; coins: number }[]
}

// Heist result data
export interface HeistResultData {
  thiefName: string
  victimName: string
  amountStolen: number
}

// Ponzi result data
export interface PonziResultData {
  playerName: string
  invested: boolean
  won?: boolean
  coinsChange?: number
}

// Police/Snitch result data
export interface PoliceResultData {
  snitchName: string
  victimName: string
  coinsLost: number
}

// Identity theft result data (replaces marriage)
export interface IdentityTheftResultData {
  player1Name: string
  player2Name: string
  player1OldCoins: number
  player2OldCoins: number
  player1NewCoins: number
  player2NewCoins: number
}

// Messages sent from guest to host
export type GuestToHostMessage =
  | { type: "JOIN_REQUEST"; playerName: string }
  | { type: "SUBMIT_ANSWER"; playerId: string; questionIndex: number; answerIndex: number }
  | { type: "NEXT_QUESTION"; playerId: string; wasCorrect: boolean }
  | { type: "HEIST_TARGET_SELECTED"; playerId: string; targetPlayerId: string }
  | { type: "PONZI_CHOICE"; playerId: string; invest: boolean }
  | { type: "POLICE_TARGET_SELECTED"; playerId: string; targetPlayerId: string }
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
      lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
      tileEvent: TileEventData | null
      allPlayers: Player[]
    }
  | {
      type: "HEIST_PROMPT"
      playerId: string
      heistData: HeistPromptData
    }
  | {
      type: "HEIST_RESULT"
      result: HeistResultData
      allPlayers: Player[]
    }
  | {
      type: "PONZI_PROMPT"
      playerId: string
      ponziData: PonziPromptData
    }
  | {
      type: "PONZI_RESULT"
      result: PonziResultData
      allPlayers: Player[]
    }
  | {
      type: "POLICE_PROMPT"
      playerId: string
      policeData: PolicePromptData
    }
  | {
      type: "POLICE_RESULT"
      result: PoliceResultData
      allPlayers: Player[]
    }
  | {
      type: "IDENTITY_THEFT_EVENT"
      result: IdentityTheftResultData
      allPlayers: Player[]
    }
  | { type: "GAME_RESET" }
  | { type: "HOST_DISCONNECTED" }

export type P2PMessage = GuestToHostMessage | HostToGuestMessage

// Game engine state (for host)
export interface GameEngineState {
  players: Map<string, Player>
  gameStarted: boolean
  // Pending interactive effects
  pendingHeist?: {
    playerId: string
    type: "10" | "100" | "50"
  }
  pendingPonzi?: {
    playerId: string
  }
  pendingPolice?: {
    playerId: string
  }
}
