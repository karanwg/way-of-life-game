import type { Player } from "./types"
import type { GameEngineState } from "./p2p-types"
import { QUESTIONS } from "./questions"
import { getTileById } from "./board-tiles"
import { processTileEffect, rollDie, movePlayerForward } from "./board-logic"

const LAP_BONUS_AMOUNT = 300

/**
 * P2P Game Engine - Runs on the host's browser
 * Manages all game state and processes all game actions
 */
export class P2PGameEngine {
  private state: GameEngineState

  constructor() {
    this.state = {
      players: new Map(),
      gameStarted: false,
    }
  }

  // Get all players as sorted array
  getAllPlayers(): Player[] {
    return Array.from(this.state.players.values()).sort((a, b) => b.coins - a.coins)
  }

  // Get a specific player
  getPlayer(playerId: string): Player | undefined {
    return this.state.players.get(playerId)
  }

  // Check if game has started
  isGameStarted(): boolean {
    return this.state.gameStarted
  }

  // Start the game
  startGame(): Player[] {
    this.state.gameStarted = true
    return this.getAllPlayers()
  }

  // Add a new player
  addPlayer(playerId: string, playerName: string): Player {
    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      coins: 0,
      currentQuestionIndex: 0,
      answered: false,
      selectedAnswer: null,
      currentTileId: 0,
      lapsCompleted: 0,
      skippedNextQuestion: false,
      nextRolledMax: null,
    }
    this.state.players.set(playerId, newPlayer)
    return newPlayer
  }

  // Remove a player
  removePlayer(playerId: string): boolean {
    return this.state.players.delete(playerId)
  }

  // Process an answer submission
  submitAnswer(
    playerId: string,
    questionIndex: number,
    selectedAnswerIndex: number
  ): { correct: boolean; newCoins: number } | null {
    const player = this.state.players.get(playerId)
    if (!player) return null

    const question = QUESTIONS[questionIndex]
    if (!question) return null

    const correct = selectedAnswerIndex === question.correctAnswerIndex
    const coinsDelta = correct ? 100 : -50
    player.coins += coinsDelta
    player.selectedAnswer = selectedAnswerIndex
    player.answered = true

    return { correct, newCoins: player.coins }
  }

  // Advance to next question (with dice roll and movement for correct answers)
  advanceQuestion(playerId: string, wasCorrect: boolean): {
    dieRoll: number | null
    tileEvent: { tileName: string; tileText: string; coinsDelta: number; isGlobal: boolean } | null
    lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
  } | null {
    const player = this.state.players.get(playerId)
    if (!player) return null

    let dieRoll: number | null = null
    let tileEvent: { tileName: string; tileText: string; coinsDelta: number; isGlobal: boolean } | null = null
    let lapBonus: { lapsCompleted: number; coinsAwarded: number } | null = null

    if (!wasCorrect) {
      // Wrong answer - just advance question, no movement
      player.currentQuestionIndex += 1
      player.answered = false
      player.selectedAnswer = null
      return { dieRoll: null, tileEvent: null, lapBonus: null }
    }

    if (player.skippedNextQuestion) {
      player.skippedNextQuestion = false
      player.currentQuestionIndex += 1
    } else {
      const maxRoll = player.nextRolledMax || 4 // d4 die
      dieRoll = rollDie(maxRoll)
      player.nextRolledMax = null

      const newTileId = movePlayerForward(player.currentTileId, dieRoll)
      const previousTileId = player.currentTileId

      const passedSpawn = newTileId < previousTileId && previousTileId !== 0

      if (passedSpawn) {
        player.lapsCompleted += 1
        player.coins += LAP_BONUS_AMOUNT
        lapBonus = {
          lapsCompleted: player.lapsCompleted,
          coinsAwarded: LAP_BONUS_AMOUNT,
        }
      }

      player.currentTileId = newTileId
      const tile = getTileById(newTileId)
      if (tile) {
        const tileResult = processTileEffect(player, tile, this.state.players)

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
            const otherPlayer = this.state.players.get(otherId)
            if (otherPlayer) {
              otherPlayer.coins += tileResult.globalEffect.coinsPerPlayer
            }
          }
        }

        if (!tileResult.skipEvent) {
          tileEvent = {
            tileName: tile.name,
            tileText: tile.text,
            coinsDelta: tileResult.coinsDelta,
            isGlobal: !!tileResult.globalEffect,
          }
        }
      }

      player.currentQuestionIndex += 1
    }

    player.answered = false
    player.selectedAnswer = null

    return { dieRoll, tileEvent, lapBonus }
  }

  // Reset the game
  reset(): void {
    this.state.players.clear()
    this.state.gameStarted = false
  }

  // Get player count
  getPlayerCount(): number {
    return this.state.players.size
  }
}
