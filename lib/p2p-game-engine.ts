import type { Player } from "./types"
import type {
  GameEngineState,
  TileEventData,
  HeistPromptData,
  HeistResultData,
  PonziPromptData,
  PonziResultData,
  MarriageResultData,
} from "./p2p-types"
import { QUESTIONS } from "./questions"
import { getTileById, TILES } from "./board-tiles"
import { rollDie, movePlayerForward, didPassSpawn, rollMarriageChance, rollPonziOutcome } from "./board-logic"

const LAP_BONUS_AMOUNT = 300

export interface MoveResult {
  dieRoll: number | null
  skippedDueToJail: boolean
  lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
  tileEvent: TileEventData | null
  // Interactive prompts (only one can be active)
  heistPrompt?: HeistPromptData
  ponziPrompt?: PonziPromptData
  // Post-effect events
  marriageEvent?: MarriageResultData
  jailApplied?: boolean
}

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
      hasJailDebuff: false,
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

  /**
   * Advance to next question with movement and tile effects
   * Order of operations:
   * 1. Check if correct answer
   * 2. Check Jail debuff → skip movement if active
   * 3. Roll die and move
   * 4. Apply pass-Start bonus
   * 5. Resolve tile effect (may require interaction)
   * 6. Check for marriage event
   */
  advanceQuestion(playerId: string, wasCorrect: boolean): MoveResult | null {
    const player = this.state.players.get(playerId)
    if (!player) return null

    const result: MoveResult = {
      dieRoll: null,
      skippedDueToJail: false,
      lapBonus: null,
      tileEvent: null,
    }

    // Wrong answer - just advance question, no movement
    if (!wasCorrect) {
      player.currentQuestionIndex += 1
      player.answered = false
      player.selectedAnswer = null
      return result
    }

    // Step 2: Check Jail debuff
    if (player.hasJailDebuff) {
      player.hasJailDebuff = false
      result.skippedDueToJail = true
      player.currentQuestionIndex += 1
      player.answered = false
      player.selectedAnswer = null
      return result
    }

    // Step 3: Roll die and move
    const dieRoll = rollDie(4) // d4
    result.dieRoll = dieRoll

    const previousTileId = player.currentTileId
    const newTileId = movePlayerForward(previousTileId, dieRoll)
    player.currentTileId = newTileId

    // Step 4: Check if passed Spawn (lap bonus)
    if (didPassSpawn(previousTileId, newTileId)) {
      player.lapsCompleted += 1
      player.coins += LAP_BONUS_AMOUNT
      result.lapBonus = {
        lapsCompleted: player.lapsCompleted,
        coinsAwarded: LAP_BONUS_AMOUNT,
      }
    }

    // Step 5: Resolve tile effect
    const tile = getTileById(newTileId)
    if (tile) {
      switch (tile.effect) {
        case "none":
          // No effect
          break

        case "coins":
          // Simple coin change
          const coinsDelta = tile.coins || 0
          player.coins += coinsDelta
          result.tileEvent = {
            tileName: tile.name,
            tileText: tile.text,
            coinsDelta,
          }
          break

        case "heist_light":
          // Prompt player to select target - steal 100 coins
          const lightTargets = this.getHeistTargets(playerId)
          if (lightTargets.length > 0) {
            this.state.pendingHeist = { playerId, type: "light" }
            result.heistPrompt = {
              type: "light",
              availableTargets: lightTargets,
            }
          }
          result.tileEvent = {
            tileName: tile.name,
            tileText: tile.text,
            coinsDelta: 0,
          }
          break

        case "heist_heavy":
          // Prompt player to select target - steal 50% coins
          const heavyTargets = this.getHeistTargets(playerId)
          if (heavyTargets.length > 0) {
            this.state.pendingHeist = { playerId, type: "heavy" }
            result.heistPrompt = {
              type: "heavy",
              availableTargets: heavyTargets,
            }
          }
          result.tileEvent = {
            tileName: tile.name,
            tileText: tile.text,
            coinsDelta: 0,
          }
          break

        case "ponzi":
          // Prompt player to invest or skip
          this.state.pendingPonzi = { playerId }
          result.ponziPrompt = {
            currentCoins: player.coins,
          }
          result.tileEvent = {
            tileName: tile.name,
            tileText: tile.text,
            coinsDelta: 0,
          }
          break

        case "jail":
          // Apply jail debuff
          player.hasJailDebuff = true
          result.jailApplied = true
          result.tileEvent = {
            tileName: tile.name,
            tileText: tile.text,
            coinsDelta: 0,
          }
          break
      }
    }

    // Step 6: Check for marriage event (only if no interactive prompt pending)
    if (!result.heistPrompt && !result.ponziPrompt) {
      const marriageResult = this.checkMarriageEvent(playerId, newTileId)
      if (marriageResult) {
        result.marriageEvent = marriageResult
      }
    }

    player.currentQuestionIndex += 1
    player.answered = false
    player.selectedAnswer = null

    return result
  }

  // Get available targets for heist
  private getHeistTargets(thiefId: string): { id: string; name: string; coins: number }[] {
    return Array.from(this.state.players.values())
      .filter((p) => p.id !== thiefId)
      .map((p) => ({ id: p.id, name: p.name, coins: p.coins }))
  }

  // Process heist target selection
  processHeistTarget(thiefId: string, targetId: string): HeistResultData | null {
    const pending = this.state.pendingHeist
    if (!pending || pending.playerId !== thiefId) return null

    const thief = this.state.players.get(thiefId)
    const victim = this.state.players.get(targetId)
    if (!thief || !victim) return null

    let amountStolen = 0

    if (pending.type === "light") {
      // Steal up to 100 coins
      amountStolen = Math.min(100, victim.coins)
    } else {
      // Steal 50% of victim's coins, but leave them with at least 50
      const maxSteal = Math.max(0, victim.coins - 50)
      const fiftyPercent = Math.floor(victim.coins * 0.5)
      amountStolen = Math.min(fiftyPercent, maxSteal)
    }

    victim.coins -= amountStolen
    thief.coins += amountStolen

    // Clear pending state
    this.state.pendingHeist = undefined

    // Check for marriage after heist resolves
    const marriageResult = this.checkMarriageEvent(thiefId, thief.currentTileId)

    return {
      thiefName: thief.name,
      victimName: victim.name,
      amountStolen,
    }
  }

  // Process Ponzi scheme choice
  processPonziChoice(playerId: string, invest: boolean): PonziResultData | null {
    const pending = this.state.pendingPonzi
    if (!pending || pending.playerId !== playerId) return null

    const player = this.state.players.get(playerId)
    if (!player) return null

    const result: PonziResultData = {
      playerName: player.name,
      invested: invest,
    }

    if (invest) {
      const won = rollPonziOutcome()
      const fiftyPercent = Math.floor(player.coins * 0.5)
      
      if (won) {
        player.coins += fiftyPercent
        result.coinsChange = fiftyPercent
      } else {
        player.coins -= fiftyPercent
        result.coinsChange = -fiftyPercent
      }
      result.won = won
    }

    // Clear pending state
    this.state.pendingPonzi = undefined

    return result
  }

  // Check and process marriage event
  private checkMarriageEvent(activePlayerId: string, tileId: number): MarriageResultData | null {
    const activePlayer = this.state.players.get(activePlayerId)
    if (!activePlayer) return null

    // Find other players on the same tile
    const playersOnTile = Array.from(this.state.players.values()).filter(
      (p) => p.id !== activePlayerId && p.currentTileId === tileId
    )

    if (playersOnTile.length === 0) return null

    // Roll 20% chance for marriage
    if (!rollMarriageChance()) return null

    // Select one player to marry (random from those on tile)
    const spouse = playersOnTile[Math.floor(Math.random() * playersOnTile.length)]

    // Pool and split coins
    const pooledCoins = activePlayer.coins + spouse.coins
    const eachReceived = Math.floor(pooledCoins / 2)

    activePlayer.coins = eachReceived
    spouse.coins = eachReceived

    return {
      player1Name: activePlayer.name,
      player2Name: spouse.name,
      pooledCoins,
      eachReceived,
    }
  }

  // Get marriage check result after interactive effect resolves
  checkMarriageAfterInteractive(playerId: string): MarriageResultData | null {
    const player = this.state.players.get(playerId)
    if (!player) return null
    return this.checkMarriageEvent(playerId, player.currentTileId)
  }

  // Reset the game
  reset(): void {
    this.state.players.clear()
    this.state.gameStarted = false
    this.state.pendingHeist = undefined
    this.state.pendingPonzi = undefined
  }

  // Get player count
  getPlayerCount(): number {
    return this.state.players.size
  }

  // Check if there's a pending interactive effect for a player
  hasPendingInteraction(playerId: string): boolean {
    return (
      (this.state.pendingHeist?.playerId === playerId) ||
      (this.state.pendingPonzi?.playerId === playerId)
    )
  }
}
