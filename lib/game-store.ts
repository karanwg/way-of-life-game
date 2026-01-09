import { EventEmitter } from "events"
import type { Player, GameState, GameEvent } from "./types"
import { QUESTIONS } from "./questions"

// Singleton event emitter for pub-sub
export const gameEventEmitter = new EventEmitter()

// Singleton in-memory game state
let gameState: GameState = {
  players: new Map(),
}

export function getGameState(): GameState {
  return gameState
}

export function addPlayer(player: Player): void {
  gameState.players.set(player.id, player)
  const event: GameEvent = {
    type: "PLAYER_JOINED",
    player,
  }
  gameEventEmitter.emit("game-event", event)
}

export function updatePlayerAnswer(
  playerId: string,
  questionIndex: number,
  selectedAnswerIndex: number,
): { correct: boolean; newCoins: number } | null {
  const player = gameState.players.get(playerId)
  if (!player) return null

  const question = QUESTIONS[questionIndex]
  if (!question) return null

  const correct = selectedAnswerIndex === question.correctAnswerIndex
  const coinsDelta = correct ? 100 : -50
  player.coins += coinsDelta
  player.selectedAnswer = selectedAnswerIndex
  player.answered = true

  const event: GameEvent = {
    type: "QUESTION_ANSWERED",
    playerId,
    correct,
    newCoins: player.coins,
  }
  gameEventEmitter.emit("game-event", event)

  return { correct, newCoins: player.coins }
}

export function advanceQuestion(playerId: string): void {
  const player = gameState.players.get(playerId)
  if (player) {
    player.currentQuestionIndex += 1
    player.answered = false
    player.selectedAnswer = null
  }
}

export function resetGameState(): void {
  gameState = {
    players: new Map(),
  }
  const event: GameEvent = {
    type: "GAME_RESET",
  }
  gameEventEmitter.emit("game-event", event)
}

export function getAllPlayers(): Player[] {
  return Array.from(gameState.players.values()).sort((a, b) => b.coins - a.coins)
}

export function getPlayer(playerId: string): Player | undefined {
  return gameState.players.get(playerId)
}
