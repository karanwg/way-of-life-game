export type Player = {
  id: string
  name: string
  coins: number
  currentQuestionIndex: number
  answered: boolean
  selectedAnswer: number | null
  currentTileId: number
  lapsCompleted: number
  hasJailDebuff: boolean // Next correct answer skips movement
}

export type Question = {
  id: number
  question: string
  options: string[]
  correctAnswerIndex: number
}

export type GameEvent =
  | { type: "PLAYER_JOINED"; player: Player }
  | { type: "QUESTION_ANSWERED"; playerId: string; correct: boolean; newCoins: number }
  | { type: "GAME_RESET" }
  | { type: "GAME_STATE_UPDATE"; players: Player[] }
  | { type: "TILE_LANDED"; playerId: string; tileName: string; tileText: string; coinsDelta: number; isGlobal: boolean }
  | { type: "TILE_TELEPORTED"; playerId: string; fromTile: string; toTile: string }

export type GameState = {
  players: Map<string, Player>
}
