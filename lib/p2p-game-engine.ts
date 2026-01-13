import type { Player } from "./types"
import type {
  GameEngineState,
  TileEventData,
  HeistPromptData,
  HeistResultData,
  PonziPromptData,
  PonziResultData,
  PolicePromptData,
  PoliceResultData,
  IdentityTheftResultData,
} from "./p2p-types"
import { QUESTIONS } from "./questions"
import { getTileById, TILES } from "./board-tiles"
import { rollDie, movePlayerForward, didPassHome, rollIdentityTheftChance, rollPonziOutcome } from "./board-logic"

const LAP_BONUS_AMOUNT = 300

export interface MoveResult {
  dieRoll: number | null
  lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
  tileEvent: TileEventData | null
  // Interactive prompts (only one can be active)
  heistPrompt?: HeistPromptData
  ponziPrompt?: PonziPromptData
  policePrompt?: PolicePromptData
  // Post-effect events
  identityTheftEvent?: IdentityTheftResultData
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
   * 2. Roll die and move
   * 3. Apply pass-Home bonus
   * 4. Resolve tile effect (may require interaction)
   * 5. Check for identity theft event
   */
  advanceQuestion(playerId: string, wasCorrect: boolean): MoveResult | null {
    const player = this.state.players.get(playerId)
    if (!player) return null

    const result: MoveResult = {
      dieRoll: null,
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

    // Step 2: Roll die and move
    const dieRoll = rollDie(4) // d4
    result.dieRoll = dieRoll

    const previousTileId = player.currentTileId
    const newTileId = movePlayerForward(previousTileId, dieRoll)
    player.currentTileId = newTileId

    // Step 3: Check if passed Home (lap bonus)
    if (didPassHome(previousTileId, newTileId)) {
      player.lapsCompleted += 1
      player.coins += LAP_BONUS_AMOUNT
      result.lapBonus = {
        lapsCompleted: player.lapsCompleted,
        coinsAwarded: LAP_BONUS_AMOUNT,
      }
    }

    // Step 4: Resolve tile effect
    const tile = getTileById(newTileId)
    if (tile) {
      switch (tile.effect) {
        case "none":
          // No effect
          break

        case "coins":
          // Simple coin change (including Home +100)
          const coinsDelta = tile.coins || 0
          player.coins += coinsDelta
          result.tileEvent = {
            tileName: tile.name,
            tileText: tile.text,
            coinsDelta,
          }
          break

        case "heist_10":
          // Prompt player to select target - steal 10% coins
          const targets10 = this.getHeistTargets(playerId)
          if (targets10.length > 0) {
            this.state.pendingHeist = { playerId, type: "10" }
            result.heistPrompt = {
              type: "10",
              availableTargets: targets10,
            }
          }
          result.tileEvent = {
            tileName: tile.name,
            tileText: tile.text,
            coinsDelta: 0,
          }
          break

        case "heist_100":
          // Prompt player to select target - steal 100 coins
          const targets100 = this.getHeistTargets(playerId)
          if (targets100.length > 0) {
            this.state.pendingHeist = { playerId, type: "100" }
            result.heistPrompt = {
              type: "100",
              availableTargets: targets100,
            }
          }
          result.tileEvent = {
            tileName: tile.name,
            tileText: tile.text,
            coinsDelta: 0,
          }
          break

        case "heist_50":
          // Prompt player to select target - steal 50% coins
          const targets50 = this.getHeistTargets(playerId)
          if (targets50.length > 0) {
            this.state.pendingHeist = { playerId, type: "50" }
            result.heistPrompt = {
              type: "50",
              availableTargets: targets50,
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

        case "police_station":
          // Prompt player to snitch on someone
          const policeTargets = this.getHeistTargets(playerId)
          if (policeTargets.length > 0) {
            this.state.pendingPolice = { playerId }
            result.policePrompt = {
              availableTargets: policeTargets,
            }
          }
          result.tileEvent = {
            tileName: tile.name,
            tileText: tile.text,
            coinsDelta: 0,
          }
          break
      }
    }

    // Step 5: Check for identity theft event (only if no interactive prompt pending)
    if (!result.heistPrompt && !result.ponziPrompt && !result.policePrompt) {
      const identityTheftResult = this.checkIdentityTheftEvent(playerId, newTileId)
      if (identityTheftResult) {
        result.identityTheftEvent = identityTheftResult
      }
    }

    player.currentQuestionIndex += 1
    player.answered = false
    player.selectedAnswer = null

    return result
  }

  // Get available targets for heist/police
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

    if (pending.type === "10") {
      // Steal 10% of victim's coins
      amountStolen = Math.floor(victim.coins * 0.1)
    } else if (pending.type === "100") {
      // Steal up to 100 coins
      amountStolen = Math.min(100, victim.coins)
    } else if (pending.type === "50") {
      // Steal 50% of victim's coins
      amountStolen = Math.floor(victim.coins * 0.5)
    }

    victim.coins -= amountStolen
    thief.coins += amountStolen

    // Clear pending state
    this.state.pendingHeist = undefined

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
      const won = rollPonziOutcome() // 75% chance to win
      
      if (won) {
        // Double coins
        const gain = player.coins
        player.coins *= 2
        result.coinsChange = gain
      } else {
        // Lose half
        const loss = Math.floor(player.coins / 2)
        player.coins -= loss
        result.coinsChange = -loss
      }
      result.won = won
    }

    // Clear pending state
    this.state.pendingPonzi = undefined

    return result
  }

  // Process police station snitch
  processPoliceTarget(snitchId: string, targetId: string): PoliceResultData | null {
    const pending = this.state.pendingPolice
    if (!pending || pending.playerId !== snitchId) return null

    const snitch = this.state.players.get(snitchId)
    const victim = this.state.players.get(targetId)
    if (!snitch || !victim) return null

    // Victim loses 300 coins (or whatever they have)
    const coinsLost = Math.min(300, victim.coins)
    victim.coins -= coinsLost

    // Clear pending state
    this.state.pendingPolice = undefined

    return {
      snitchName: snitch.name,
      victimName: victim.name,
      coinsLost,
    }
  }

  // Check and process identity theft event (replaces marriage)
  private checkIdentityTheftEvent(activePlayerId: string, tileId: number): IdentityTheftResultData | null {
    const activePlayer = this.state.players.get(activePlayerId)
    if (!activePlayer) return null

    // Find other players on the same tile
    const playersOnTile = Array.from(this.state.players.values()).filter(
      (p) => p.id !== activePlayerId && p.currentTileId === tileId
    )

    if (playersOnTile.length === 0) return null

    // Roll 25% chance for identity theft
    if (!rollIdentityTheftChance()) return null

    // Select one player to swap coins with (random from those on tile)
    const victim = playersOnTile[Math.floor(Math.random() * playersOnTile.length)]

    // Store old coins
    const player1OldCoins = activePlayer.coins
    const player2OldCoins = victim.coins

    // Swap coins
    activePlayer.coins = player2OldCoins
    victim.coins = player1OldCoins

    return {
      player1Name: activePlayer.name,
      player2Name: victim.name,
      player1OldCoins,
      player2OldCoins,
      player1NewCoins: activePlayer.coins,
      player2NewCoins: victim.coins,
    }
  }

  // Get identity theft check result after interactive effect resolves
  checkIdentityTheftAfterInteractive(playerId: string): IdentityTheftResultData | null {
    const player = this.state.players.get(playerId)
    if (!player) return null
    return this.checkIdentityTheftEvent(playerId, player.currentTileId)
  }

  // Reset the game
  reset(): void {
    this.state.players.clear()
    this.state.gameStarted = false
    this.state.pendingHeist = undefined
    this.state.pendingPonzi = undefined
    this.state.pendingPolice = undefined
  }

  // Get player count
  getPlayerCount(): number {
    return this.state.players.size
  }

  // Check if there's a pending interactive effect for a player
  hasPendingInteraction(playerId: string): boolean {
    return (
      this.state.pendingHeist?.playerId === playerId ||
      this.state.pendingPonzi?.playerId === playerId ||
      this.state.pendingPolice?.playerId === playerId
    )
  }
}
