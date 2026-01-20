/**
 * P2P Game Engine - The authoritative game state manager
 * 
 * This engine runs ONLY on the host's browser and processes all game actions.
 * It maintains the source of truth for player positions, coins, and game progress.
 * 
 * ARCHITECTURE:
 * - Host creates the engine and processes all game actions
 * - Guests send action requests to the host via PeerJS
 * - Host processes actions and broadcasts results to all players
 * 
 * TURN FLOW:
 * 1. Player answers a question (correct = +100 coins, wrong = -50 coins)
 * 2. If correct, player rolls dice and moves
 * 3. Lap bonus applied if player passes GO
 * 4. Tile effect applied (may trigger interactive prompt)
 * 5. If no interactive prompt, check for identity theft event
 * 6. After interactive prompt resolves, check for identity theft
 */

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
  SwapMeetPromptData,
  SwapMeetResultData,
  IdentityTheftResultData,
} from "./p2p-types"
import { QUESTIONS } from "./questions"
import { getTileById, TILES } from "./board-tiles"
import { rollDie, movePlayerForward, didPassHome, rollIdentityTheftChance, rollPonziOutcome } from "./board-logic"
import { getScaledCoinAmount, calculateAverageCoins } from "./coin-scaling"

// Constants
const LAP_BONUS_AMOUNT = 200

/**
 * Result of processing a player's move
 * Contains all the information needed to update UI and notify players
 */
export interface MoveResult {
  /** Total die roll value (sum of all rolls if rolling 6s) */
  dieRoll: number | null
  /** Individual roll values (for displaying "6! Roll again!") */
  dieRolls: number[]
  /** Lap bonus if player passed GO */
  lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
  /** Tile event data for the tile landed on */
  tileEvent: TileEventData | null
  /** Interactive prompts - only one can be active at a time */
  heistPrompt?: HeistPromptData
  ponziPrompt?: PonziPromptData
  policePrompt?: PolicePromptData
  swapMeetPrompt?: SwapMeetPromptData
  /** Identity theft event if it occurred (coin swap with player on same tile) */
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

  // ============================================================================
  // PLAYER MANAGEMENT
  // ============================================================================

  /** Get all players as array sorted by coins (descending) */
  getAllPlayers(): Player[] {
    return Array.from(this.state.players.values()).sort((a, b) => b.coins - a.coins)
  }

  /** Get a specific player by ID */
  getPlayer(playerId: string): Player | undefined {
    return this.state.players.get(playerId)
  }

  /** Add a new player to the game */
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

  /** Remove a player from the game */
  removePlayer(playerId: string): boolean {
    // Also clear any pending states for this player
    if (this.state.pendingHeist?.playerId === playerId) {
      this.state.pendingHeist = undefined
    }
    if (this.state.pendingPonzi?.playerId === playerId) {
      this.state.pendingPonzi = undefined
    }
    if (this.state.pendingPolice?.playerId === playerId) {
      this.state.pendingPolice = undefined
    }
    if (this.state.pendingSwapMeet?.playerId === playerId) {
      this.state.pendingSwapMeet = undefined
    }
    return this.state.players.delete(playerId)
  }

  /** Get current player count */
  getPlayerCount(): number {
    return this.state.players.size
  }

  // ============================================================================
  // GAME LIFECYCLE
  // ============================================================================

  /** Check if game has started */
  isGameStarted(): boolean {
    return this.state.gameStarted
  }

  /** Start the game */
  startGame(): Player[] {
    this.state.gameStarted = true
    return this.getAllPlayers()
  }

  /** Reset the game completely */
  reset(): void {
    this.state.players.clear()
    this.state.gameStarted = false
    this.state.pendingHeist = undefined
    this.state.pendingPonzi = undefined
    this.state.pendingPolice = undefined
  }

  // ============================================================================
  // QUIZ ACTIONS
  // ============================================================================

  /**
   * Process an answer submission
   * @returns Result with correctness and new coin total, or null if invalid
   */
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
    const coinsDelta = correct ? 300 : 0
    player.coins += coinsDelta
    player.selectedAnswer = selectedAnswerIndex
    player.answered = true

    return { correct, newCoins: player.coins }
  }

  // ============================================================================
  // MOVEMENT & TILE EFFECTS
  // ============================================================================

  /**
   * Advance to next question with movement and tile effects
   * 
   * Order of operations:
   * 1. If wrong answer, just advance question index (no movement)
   * 2. If correct, roll die and move player
   * 3. Apply lap bonus if player passed GO
   * 4. Apply tile effect (may set pending interactive prompt)
   * 5. If no interactive prompt, check for identity theft event
   * 
   * IMPORTANT: Identity theft is skipped if swap_meet already occurred this turn
   */
  advanceQuestion(playerId: string, wasCorrect: boolean): MoveResult | null {
    const player = this.state.players.get(playerId)
    if (!player) return null

    const result: MoveResult = {
      dieRoll: null,
      dieRolls: [],
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

    // Step 1: Roll die and move
    const dieRoll = rollDie(6)
    result.dieRoll = dieRoll
    result.dieRolls = [dieRoll]

    const previousTileId = player.currentTileId
    const newTileId = movePlayerForward(previousTileId, dieRoll)
    player.currentTileId = newTileId

    // Step 2: Check if passed GO (lap bonus)
    if (didPassHome(previousTileId, newTileId)) {
      player.lapsCompleted += 1
      player.coins += LAP_BONUS_AMOUNT
      result.lapBonus = {
        lapsCompleted: player.lapsCompleted,
        coinsAwarded: LAP_BONUS_AMOUNT,
      }
    }

    // Step 3: Apply tile effect
    const tile = getTileById(newTileId)
    let swapOccurred = false // Track if a coin swap happened this turn

    if (tile) {
      const tileResult = this.applyTileEffect(player, tile)
      result.tileEvent = tileResult.tileEvent
      result.heistPrompt = tileResult.heistPrompt
      result.ponziPrompt = tileResult.ponziPrompt
      result.policePrompt = tileResult.policePrompt
      result.swapMeetPrompt = tileResult.swapMeetPrompt
      swapOccurred = tileResult.tileEvent?.swapOccurred || false
    }

    // Step 4: Check for identity theft event
    // ONLY if no interactive prompt pending AND no swap already occurred this turn
    const hasInteractivePrompt = result.heistPrompt || result.ponziPrompt || result.policePrompt || result.swapMeetPrompt
    
    if (!hasInteractivePrompt && !swapOccurred) {
      const identityTheftResult = this.checkIdentityTheftEvent(playerId, newTileId)
      if (identityTheftResult) {
        result.identityTheftEvent = identityTheftResult
      }
    }

    // Advance question for next round
    player.currentQuestionIndex += 1
    player.answered = false
    player.selectedAnswer = null

    return result
  }

  /**
   * Apply the effect of landing on a tile
   * @returns Object containing tile event data and any interactive prompts
   */
  private applyTileEffect(
    player: Player,
    tile: { id: number; name: string; effect: string; coins?: number; text: string }
  ): {
    tileEvent: TileEventData | null
    heistPrompt?: HeistPromptData
    ponziPrompt?: PonziPromptData
    policePrompt?: PolicePromptData
    swapMeetPrompt?: SwapMeetPromptData
  } {
    const playerId = player.id

    switch (tile.effect) {
      case "none":
        return { tileEvent: null }

      case "coins": {
        // Simple coin change (GO, regular tiles)
        // GO (tile 0) uses fixed amount, other tiles scale with average coins
        const baseAmount = tile.coins || 0
        const coinsDelta = tile.id === 0 ? baseAmount : this.getScaledCoinAmountForPlayer(baseAmount)
        player.coins += coinsDelta
        
        // Update tile text to show actual scaled amount
        const scaledText = tile.id === 0 
          ? tile.text 
          : tile.text.replace(/[+-]?\d+/, (coinsDelta >= 0 ? '+' : '') + coinsDelta.toString())
        
        return {
          tileEvent: {
            tileName: tile.name,
            tileText: scaledText,
            coinsDelta,
          },
        }
      }

      case "heist_10":
      case "heist_100":
      case "heist_50": {
        // Heist - player selects a target to steal from
        // Only players who haven't completed are vulnerable
        const heistType = tile.effect.replace("heist_", "") as "10" | "100" | "50"
        const targets = this.getVulnerableOtherPlayers(playerId)
        
        if (targets.length > 0) {
          this.state.pendingHeist = { playerId, type: heistType }
          return {
            tileEvent: { tileName: tile.name, tileText: tile.text, coinsDelta: 0 },
            heistPrompt: { type: heistType, availableTargets: targets },
          }
        }
        return { tileEvent: { tileName: tile.name, tileText: "No one to steal from!", coinsDelta: 0 } }
      }

      case "ponzi": {
        // Ponzi/Gamble - player chooses to invest or skip
        this.state.pendingPonzi = { playerId }
        return {
          tileEvent: { tileName: tile.name, tileText: tile.text, coinsDelta: 0 },
          ponziPrompt: { currentCoins: player.coins },
        }
      }

      case "police_station": {
        // Police - player reports someone who loses coins
        // Only players who haven't completed are vulnerable
        const targets = this.getVulnerableOtherPlayers(playerId)
        
        if (targets.length > 0) {
          this.state.pendingPolice = { playerId }
          return {
            tileEvent: { tileName: tile.name, tileText: tile.text, coinsDelta: 0 },
            policePrompt: { availableTargets: targets },
          }
        }
        return { tileEvent: { tileName: tile.name, tileText: "No one to report!", coinsDelta: 0 } }
      }

      case "robin_hood": {
        // Steal from richest, give to poorest (player is just the trigger)
        // Only players who haven't completed are vulnerable
        const others = this.getVulnerableOtherPlayersRaw(playerId)
        if (others.length === 0) {
          return { tileEvent: { tileName: tile.name, tileText: "No one to help!", coinsDelta: 0 } }
        }

        const richest = others.reduce((a, b) => a.coins > b.coins ? a : b)
        const poorest = others.reduce((a, b) => a.coins < b.coins ? a : b)
        const stealAmount = Math.min(150, richest.coins)
        
        richest.coins -= stealAmount
        poorest.coins += stealAmount

        const impacted: TileEventData["impactedPlayers"] = []
        impacted.push({ id: richest.id, name: richest.name, coinsDelta: -stealAmount })
        if (poorest.id !== richest.id) {
          impacted.push({ id: poorest.id, name: poorest.name, coinsDelta: stealAmount })
        }

        return {
          tileEvent: {
            tileName: tile.name,
            tileText: `🦸 Stole ${stealAmount} from ${richest.name}, gave to ${poorest.name}!`,
            coinsDelta: 0,
            isGlobal: true,
            impactedPlayers: impacted,
          },
        }
      }

      case "tax_collector": {
        // Take 25 coins from every other player
        // Only players who haven't completed are vulnerable
        const victims = this.getVulnerableOtherPlayersRaw(playerId)
        let totalCollected = 0
        const impacted: TileEventData["impactedPlayers"] = []
        
        victims.forEach(v => {
          const take = Math.min(25, v.coins)
          v.coins -= take
          totalCollected += take
          if (take > 0) {
            impacted.push({ id: v.id, name: v.name, coinsDelta: -take })
          }
        })
        
        player.coins += totalCollected

        return {
          tileEvent: {
            tileName: tile.name,
            tileText: `💸 Collected ${totalCollected} coins from ${victims.length} players!`,
            coinsDelta: totalCollected,
            isGlobal: true,
            impactedPlayers: impacted,
          },
        }
      }

      case "party_time": {
        // Everyone gets 50 coins!
        const allPlayers = Array.from(this.state.players.values())
        const impacted: TileEventData["impactedPlayers"] = []
        
        allPlayers.forEach(p => {
          p.coins += 50
          if (p.id !== playerId) {
            impacted.push({ id: p.id, name: p.name, coinsDelta: 50 })
          }
        })

        return {
          tileEvent: {
            tileName: tile.name,
            tileText: `🎉 PARTY! Everyone got 50 coins!`,
            coinsDelta: 50,
            isGlobal: true,
            impactedPlayers: impacted,
          },
        }
      }

      case "swap_meet": {
        // Player selects who to swap coins with
        // Only players who haven't completed are vulnerable
        const targets = this.getVulnerableOtherPlayers(playerId)
        
        if (targets.length > 0) {
          this.state.pendingSwapMeet = { playerId }
          return {
            tileEvent: { tileName: tile.name, tileText: tile.text, coinsDelta: 0 },
            swapMeetPrompt: { currentCoins: player.coins, availableTargets: targets },
          }
        }
        return { tileEvent: { tileName: tile.name, tileText: "No one to swap with!", coinsDelta: 0 } }
      }

      case "banana_peel": {
        // Push random player back 3 spaces
        // Only players who haven't completed are vulnerable
        const others = this.getVulnerableOtherPlayersRaw(playerId)
        if (others.length === 0) {
          return { tileEvent: { tileName: tile.name, tileText: "No one to prank!", coinsDelta: 0 } }
        }

        const victim = others[Math.floor(Math.random() * others.length)]
        // Move backwards, handling wrap-around
        victim.currentTileId = ((victim.currentTileId - 3) % TILES.length + TILES.length) % TILES.length

        return {
          tileEvent: {
            tileName: tile.name,
            tileText: `🍌 ${victim.name} slipped and fell back 3 spaces!`,
            coinsDelta: 0,
            isGlobal: true,
            impactedPlayers: [{ id: victim.id, name: victim.name, coinsDelta: 0 }],
          },
        }
      }

      case "coin_magnet": {
        // Steal 20 coins from each player
        // Only players who haven't completed are vulnerable
        const victims = this.getVulnerableOtherPlayersRaw(playerId)
        let totalStolen = 0
        const impacted: TileEventData["impactedPlayers"] = []
        
        victims.forEach(v => {
          const take = Math.min(20, v.coins)
          v.coins -= take
          totalStolen += take
          if (take > 0) {
            impacted.push({ id: v.id, name: v.name, coinsDelta: -take })
          }
        })
        
        player.coins += totalStolen

        return {
          tileEvent: {
            tileName: tile.name,
            tileText: `🧲 Attracted ${totalStolen} coins from everyone!`,
            coinsDelta: totalStolen,
            isGlobal: true,
            impactedPlayers: impacted,
          },
        }
      }

      case "money_bomb": {
        // Everyone else loses 50 coins
        // Only players who haven't completed are vulnerable
        const victims = this.getVulnerableOtherPlayersRaw(playerId)
        let totalLost = 0
        const impacted: TileEventData["impactedPlayers"] = []
        
        victims.forEach(v => {
          const lose = Math.min(50, v.coins)
          v.coins -= lose
          totalLost += lose
          if (lose > 0) {
            impacted.push({ id: v.id, name: v.name, coinsDelta: -lose })
          }
        })

        return {
          tileEvent: {
            tileName: tile.name,
            tileText: `💣 BOOM! Others lost ${totalLost} coins total!`,
            coinsDelta: 0,
            isGlobal: true,
            impactedPlayers: impacted,
          },
        }
      }

      default:
        return { tileEvent: null }
    }
  }

  // ============================================================================
  // INTERACTIVE EFFECTS
  // ============================================================================

  /**
   * Process heist target selection
   * @returns Result data or null if no pending heist or invalid target
   */
  processHeistTarget(thiefId: string, targetId: string): HeistResultData | null {
    const pending = this.state.pendingHeist
    if (!pending || pending.playerId !== thiefId) {
      console.warn(`processHeistTarget: No pending heist for player ${thiefId}`)
      return null
    }

    const thief = this.state.players.get(thiefId)
    const victim = this.state.players.get(targetId)
    if (!thief || !victim) {
      console.warn(`processHeistTarget: Invalid player IDs - thief: ${thiefId}, victim: ${targetId}`)
      // Clear the pending state to prevent getting stuck
      this.state.pendingHeist = undefined
      return null
    }

    let amountStolen = 0
    switch (pending.type) {
      case "10":
        amountStolen = Math.floor(victim.coins * 0.1)
        break
      case "100":
        amountStolen = Math.min(100, victim.coins)
        break
      case "50":
        amountStolen = Math.floor(victim.coins * 0.5)
        break
    }

    victim.coins -= amountStolen
    thief.coins += amountStolen

    // Clear pending state
    this.state.pendingHeist = undefined

    return {
      thiefId: thief.id,
      thiefName: thief.name,
      victimId: victim.id,
      victimName: victim.name,
      amountStolen,
    }
  }

  /**
   * Process Ponzi scheme choice
   * @param spinResult - If provided, use this as the outcome (from spin wheel). Otherwise roll randomly.
   * @returns Result data or null if no pending ponzi
   */
  processPonziChoice(playerId: string, invest: boolean, spinResult?: boolean): PonziResultData | null {
    const pending = this.state.pendingPonzi
    if (!pending || pending.playerId !== playerId) {
      console.warn(`processPonziChoice: No pending ponzi for player ${playerId}`)
      return null
    }

    const player = this.state.players.get(playerId)
    if (!player) {
      this.state.pendingPonzi = undefined
      return null
    }

    const result: PonziResultData = {
      playerId: player.id,
      playerName: player.name,
      invested: invest,
    }

    if (invest) {
      // Use spin wheel result if provided, otherwise roll randomly
      const won = spinResult !== undefined ? spinResult : rollPonziOutcome()
      
      if (won) {
        const gain = player.coins
        player.coins *= 2
        result.coinsChange = gain
      } else {
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

  /**
   * Process police station snitch
   * @returns Result data or null if no pending police action
   */
  processPoliceTarget(snitchId: string, targetId: string): PoliceResultData | null {
    const pending = this.state.pendingPolice
    if (!pending || pending.playerId !== snitchId) {
      console.warn(`processPoliceTarget: No pending police for player ${snitchId}`)
      return null
    }

    const snitch = this.state.players.get(snitchId)
    const victim = this.state.players.get(targetId)
    if (!snitch || !victim) {
      this.state.pendingPolice = undefined
      return null
    }

    const coinsLost = Math.min(300, victim.coins)
    victim.coins -= coinsLost

    // Clear pending state
    this.state.pendingPolice = undefined

    return {
      snitchId: snitch.id,
      snitchName: snitch.name,
      victimId: victim.id,
      victimName: victim.name,
      coinsLost,
    }
  }

  /**
   * Process swap meet target selection
   * Called when player selects who to swap coins with
   */
  processSwapMeetTarget(swapperId: string, targetId: string): SwapMeetResultData | null {
    const pending = this.state.pendingSwapMeet
    if (!pending || pending.playerId !== swapperId) {
      console.warn(`processSwapMeetTarget: No pending swap meet for player ${swapperId}`)
      return null
    }

    // Handle skip (empty targetId)
    if (!targetId) {
      this.state.pendingSwapMeet = undefined
      const swapper = this.state.players.get(swapperId)
      if (!swapper) return null
      // Return a "no swap" result
      return {
        swapperId: swapper.id,
        swapperName: swapper.name,
        targetId: "",
        targetName: "",
        swapperOldCoins: swapper.coins,
        targetOldCoins: 0,
        swapperNewCoins: swapper.coins,
        targetNewCoins: 0,
      }
    }

    const swapper = this.state.players.get(swapperId)
    const target = this.state.players.get(targetId)
    if (!swapper || !target) {
      this.state.pendingSwapMeet = undefined
      return null
    }

    // Swap coins
    const swapperOldCoins = swapper.coins
    const targetOldCoins = target.coins
    swapper.coins = targetOldCoins
    target.coins = swapperOldCoins

    // Clear pending state
    this.state.pendingSwapMeet = undefined

    return {
      swapperId: swapper.id,
      swapperName: swapper.name,
      targetId: target.id,
      targetName: target.name,
      swapperOldCoins,
      targetOldCoins,
      swapperNewCoins: swapper.coins,
      targetNewCoins: target.coins,
    }
  }

  /**
   * Check for identity theft event after an interactive effect resolves
   * Call this after heist/ponzi/police actions complete
   */
  checkIdentityTheftAfterInteractive(playerId: string): IdentityTheftResultData | null {
    const player = this.state.players.get(playerId)
    if (!player) return null
    return this.checkIdentityTheftEvent(playerId, player.currentTileId)
  }

  // ============================================================================
  // IDENTITY THEFT (25% chance coin swap when sharing tile)
  // ============================================================================

  /**
   * Check and process identity theft event
   * Triggers when player lands on a tile with another player (25% chance)
   */
  private checkIdentityTheftEvent(activePlayerId: string, tileId: number): IdentityTheftResultData | null {
    const activePlayer = this.state.players.get(activePlayerId)
    if (!activePlayer) return null

    // Find other players on the same tile who are still vulnerable
    // (players who completed all questions are immune)
    const playersOnTile = Array.from(this.state.players.values()).filter(
      p => p.id !== activePlayerId && p.currentTileId === tileId && !this.isPlayerComplete(p)
    )

    if (playersOnTile.length === 0) return null

    // 25% chance for identity theft
    if (!rollIdentityTheftChance()) return null

    // Select random player on the tile to swap with
    const victim = playersOnTile[Math.floor(Math.random() * playersOnTile.length)]

    // Swap coins
    const player1OldCoins = activePlayer.coins
    const player2OldCoins = victim.coins
    activePlayer.coins = player2OldCoins
    victim.coins = player1OldCoins

    return {
      player1Id: activePlayer.id,
      player1Name: activePlayer.name,
      player2Id: victim.id,
      player2Name: victim.name,
      player1OldCoins,
      player2OldCoins,
      player1NewCoins: activePlayer.coins,
      player2NewCoins: victim.coins,
    }
  }

  // ============================================================================
  // PENDING STATE MANAGEMENT
  // ============================================================================

  /** Check if there's a pending interactive effect for a player */
  hasPendingInteraction(playerId: string): boolean {
    return (
      this.state.pendingHeist?.playerId === playerId ||
      this.state.pendingPonzi?.playerId === playerId ||
      this.state.pendingPolice?.playerId === playerId
    )
  }

  /** Cancel any pending interaction for a player (used when player disconnects) */
  cancelPendingInteraction(playerId: string): void {
    if (this.state.pendingHeist?.playerId === playerId) {
      this.state.pendingHeist = undefined
    }
    if (this.state.pendingPonzi?.playerId === playerId) {
      this.state.pendingPonzi = undefined
    }
    if (this.state.pendingPolice?.playerId === playerId) {
      this.state.pendingPolice = undefined
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get the average coins across all players
   * Used for scaling tile effects based on game economy
   */
  private getAverageCoins(): number {
    return calculateAverageCoins(Array.from(this.state.players.values()))
  }

  /**
   * Scale a coin amount based on the average coins of all players
   * Uses shared utility to ensure consistency with UI display
   */
  private getScaledCoinAmountForPlayer(baseAmount: number): number {
    return getScaledCoinAmount(baseAmount, this.getAverageCoins())
  }

  /** Check if a player has completed all questions (and is thus immune to effects) */
  private isPlayerComplete(player: Player): boolean {
    return player.currentQuestionIndex >= QUESTIONS.length
  }

  /** 
   * Get other players who are still vulnerable to effects.
   * Excludes players who have completed all questions.
   * Returns format suitable for target selection prompts.
   */
  private getVulnerableOtherPlayers(excludePlayerId: string): { id: string; name: string; coins: number }[] {
    return Array.from(this.state.players.values())
      .filter(p => p.id !== excludePlayerId && !this.isPlayerComplete(p))
      .map(p => ({ id: p.id, name: p.name, coins: p.coins }))
  }

  /** 
   * Get other players who are still vulnerable to effects.
   * Excludes players who have completed all questions.
   * Returns full Player objects.
   */
  private getVulnerableOtherPlayersRaw(excludePlayerId: string): Player[] {
    return Array.from(this.state.players.values())
      .filter(p => p.id !== excludePlayerId && !this.isPlayerComplete(p))
  }
}
