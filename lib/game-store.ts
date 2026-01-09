import { EventEmitter } from "events"
import type { Player, GameState, GameEvent } from "./types"
import { QUESTIONS } from "./questions"
import { getTileById } from "./board-tiles"
import { processTileEffect, rollDie, movePlayerForward } from "./board-logic"

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
  const newPlayer: Player = {
    ...player,
    currentTileId: 0,
    lapsCompleted: 0,
    skippedNextQuestion: false,
    nextRolledMax: null,
  }
  gameState.players.set(newPlayer.id, newPlayer)
  const event: GameEvent = {
    type: "PLAYER_JOINED",
    player: newPlayer,
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
    if (player.skippedNextQuestion) {
      player.skippedNextQuestion = false
      player.currentQuestionIndex += 1
    } else {
      const maxRoll = player.nextRolledMax || 6
      const dieRoll = rollDie(maxRoll)
      player.nextRolledMax = null

      const newTileId = movePlayerForward(player.currentTileId, dieRoll)
      const wasOnStart = player.currentTileId === 0
      const nowPastStart = newTileId < player.currentTileId || (newTileId >= player.currentTileId && dieRoll > 0)

      if (!wasOnStart && newTileId <= dieRoll - 1) {
        player.lapsCompleted += 1
        player.coins += 500
      }

      player.currentTileId = newTileId
      const tile = getTileById(newTileId)
      if (tile) {
        const tileResult = processTileEffect(player, tile, gameState.players)

        player.coins += tileResult.coinsDelta

        if (tileResult.newTileId !== undefined) {
          player.currentTileId = tileResult.newTileId
        }

        if (tileResult.skippedNext) {
          player.skippedNextQuestion = true
        }

        if (tileResult.nextRolledMax !== undefined) {
          player.nextRolledMax = tileResult.nextRolledMax
        }

        if (tileResult.globalEffect) {
          for (const otherId of tileResult.globalEffect.affectedPlayers) {
            const otherPlayer = gameState.players.get(otherId)
            if (otherPlayer) {
              otherPlayer.coins += tileResult.globalEffect.coinsPerPlayer
            }
          }
        }

        const tileEvent: GameEvent = {
          type: "TILE_LANDED",
          playerId,
          tileName: tile.name,
          tileText: tile.text,
          coinsDelta: tileResult.coinsDelta,
          isGlobal: !!tileResult.globalEffect,
        }
        gameEventEmitter.emit("game-event", tileEvent)
      }
    }

    player.answered = false
    player.selectedAnswer = null
    player.currentQuestionIndex += 1
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
