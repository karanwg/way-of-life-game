/**
 * HostEngine - Network layer for the game host
 * 
 * The host runs the authoritative game engine and broadcasts
 * state updates to all connected guests.
 * 
 * RESPONSIBILITIES:
 * - Create and manage the PeerJS connection
 * - Accept guest connections
 * - Process all game actions through the game engine
 * - Broadcast results to guests
 * - Emit events to the local UI
 */

import type { Peer as PeerType, DataConnection } from "peerjs"
import { P2PGameEngine } from "../p2p-game-engine"
import type { GuestToHostMessage, HostToGuestMessage } from "../p2p-types"
import type { NetworkEvent, MoveResultForNetwork } from "./types"
import { PEER_CONFIG, roomCodeToPeerId, generateRoomCode } from "./types"

type EventHandler = (event: NetworkEvent) => void

export class HostEngine {
  private peer: PeerType | null = null
  private engine: P2PGameEngine
  private connections = new Map<string, DataConnection>()
  private connectionToPlayer = new Map<string, string>() // connection.peer -> playerId
  private eventHandler: EventHandler
  private myPlayerId: string | null = null
  private roomCode: string = ""

  constructor(eventHandler: EventHandler) {
    this.eventHandler = eventHandler
    this.engine = new P2PGameEngine()
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /** Create a new room and start hosting */
  async createRoom(hostName: string): Promise<string> {
    this.roomCode = generateRoomCode()
    const peerId = roomCodeToPeerId(this.roomCode)

    // Dynamically import PeerJS to avoid SSR issues
    const { default: Peer } = await import("peerjs")
    this.peer = new Peer(peerId, PEER_CONFIG)

    this.peer.on("open", () => {
      // Add host as first player
      this.myPlayerId = `host-${Date.now()}`
      const hostPlayer = this.engine.addPlayer(this.myPlayerId, hostName)
      const allPlayers = this.engine.getAllPlayers()

      this.emit({ type: "connected", roomCode: this.roomCode })
      this.emit({ 
        type: "identity_assigned", 
        playerId: this.myPlayerId, 
        player: hostPlayer, 
        allPlayers 
      })
    })

    this.peer.on("connection", (conn) => this.handleGuestConnection(conn))
    
    this.peer.on("error", (err) => {
      console.error("Host peer error:", err)
      this.emit({ type: "error", message: err.message })
    })

    return this.roomCode
  }

  /** Handle a new guest connection */
  private handleGuestConnection(conn: DataConnection) {
    conn.on("data", (data) => {
      this.handleGuestMessage(data as GuestToHostMessage, conn)
    })

    conn.on("close", () => {
      this.handleGuestDisconnect(conn)
    })
  }

  /** Handle guest disconnect */
  private handleGuestDisconnect(conn: DataConnection) {
    const playerId = this.connectionToPlayer.get(conn.peer)
    
    if (playerId) {
      const leavingPlayer = this.engine.getPlayer(playerId)
      const playerName = leavingPlayer?.name || "Someone"
      
      this.engine.removePlayer(playerId)
      this.connections.delete(playerId)
      this.connectionToPlayer.delete(conn.peer)
      
      const allPlayers = this.engine.getAllPlayers()
      this.broadcast({ type: "PLAYER_LEFT", playerId, playerName, allPlayers })
      this.emit({ type: "player_left", playerId, allPlayers })
    }
  }

  /** Disconnect and clean up */
  disconnect() {
    this.connections.forEach(conn => conn.close())
    this.connections.clear()
    this.connectionToPlayer.clear()
    this.peer?.destroy()
    this.peer = null
    this.engine.reset()
    this.emit({ type: "disconnected" })
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  private handleGuestMessage(message: GuestToHostMessage, conn: DataConnection) {
    switch (message.type) {
      case "JOIN_REQUEST":
        this.handleJoinRequest(message.playerName, conn)
        break
      
      case "SUBMIT_ANSWER":
        this.handleSubmitAnswer(message.playerId, message.questionIndex, message.answerIndex)
        break
      
      case "NEXT_QUESTION":
        this.handleNextQuestion(message.playerId, message.wasCorrect)
        break
      
      case "HEIST_TARGET_SELECTED":
        this.handleHeistTarget(message.playerId, message.targetPlayerId)
        break
      
      case "PONZI_CHOICE":
        this.handlePonziChoice(message.playerId, message.invest)
        break
      
      case "POLICE_TARGET_SELECTED":
        this.handlePoliceTarget(message.playerId, message.targetPlayerId)
        break
      
      case "SWAP_MEET_TARGET_SELECTED":
        this.handleSwapMeetTarget(message.playerId, message.targetPlayerId)
        break
      
      case "LEAVE_GAME":
        this.handleLeaveGame(message.playerId)
        break
    }
  }

  private handleJoinRequest(playerName: string, conn: DataConnection) {
    const playerId = `player-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    const player = this.engine.addPlayer(playerId, playerName)
    const allPlayers = this.engine.getAllPlayers()

    // Store connection mappings
    this.connections.set(playerId, conn)
    this.connectionToPlayer.set(conn.peer, playerId)

    // Send acceptance to joining player
    conn.send({ type: "JOIN_ACCEPTED", playerId, player, allPlayers })

    // Notify other guests
    this.connections.forEach((c, id) => {
      if (id !== playerId && c.open) {
        c.send({ type: "PLAYER_JOINED", player, allPlayers })
      }
    })

    // Emit local event
    this.emit({ type: "player_joined", playerId, player, allPlayers })
  }

  private handleSubmitAnswer(playerId: string, questionIndex: number, answerIndex: number) {
    const result = this.engine.submitAnswer(playerId, questionIndex, answerIndex)
    if (result) {
      const allPlayers = this.engine.getAllPlayers()
      this.broadcast({
        type: "ANSWER_RESULT",
        playerId,
        correct: result.correct,
        newCoins: result.newCoins,
        allPlayers,
      })
      // Update host's UI with new player state (coins changed)
      this.emit({ type: "players_updated", allPlayers })
    }
  }

  private handleNextQuestion(playerId: string, wasCorrect: boolean) {
    const result = this.engine.advanceQuestion(playerId, wasCorrect)
    if (!result) return

    const allPlayers = this.engine.getAllPlayers()
    const player = allPlayers.find(p => p.id === playerId)
    const hasInteractivePrompt = result.heistPrompt || result.ponziPrompt || result.policePrompt || result.swapMeetPrompt
    const tileEventToShow = hasInteractivePrompt ? null : result.tileEvent

    // Broadcast move result to guests
    this.broadcast({
      type: "MOVE_RESULT",
      playerId,
      playerName: player?.name || "Someone",
      dieRoll: result.dieRoll,
      dieRolls: result.dieRolls,
      lapBonus: result.lapBonus,
      tileEvent: tileEventToShow,
      allPlayers,
    })

    // Emit to host's own UI (so host sees guest pawn animations and state updates)
    this.emit({
      type: "players_updated",
      allPlayers,
    })

    // Send interactive prompts directly to the player who needs to act
    if (result.heistPrompt) {
      this.sendTo(playerId, { type: "HEIST_PROMPT", playerId, heistData: result.heistPrompt })
    }
    if (result.ponziPrompt) {
      this.sendTo(playerId, { type: "PONZI_PROMPT", playerId, ponziData: result.ponziPrompt })
    }
    if (result.policePrompt) {
      this.sendTo(playerId, { type: "POLICE_PROMPT", playerId, policeData: result.policePrompt })
    }
    if (result.swapMeetPrompt) {
      this.sendTo(playerId, { type: "SWAP_MEET_PROMPT", playerId, swapMeetData: result.swapMeetPrompt })
    }

    // Handle identity theft
    if (result.identityTheftEvent) {
      this.broadcast({
        type: "IDENTITY_THEFT_EVENT",
        result: result.identityTheftEvent,
        allPlayers: this.engine.getAllPlayers(),
      })
      
      // Emit to host if involved
      if (this.amInvolved(result.identityTheftEvent.player1Id, result.identityTheftEvent.player2Id)) {
        this.emit({
          type: "identity_theft",
          data: result.identityTheftEvent,
          allPlayers: this.engine.getAllPlayers(),
        })
      }
    }

    // Emit impact to host if affected by global event
    if (tileEventToShow?.isGlobal && tileEventToShow.impactedPlayers) {
      const myImpact = tileEventToShow.impactedPlayers.find(p => p.id === this.myPlayerId)
      if (myImpact) {
        this.emit({
          type: "impacted_by_event",
          tileName: tileEventToShow.tileName,
          coinsDelta: myImpact.coinsDelta,
          isBigEvent: myImpact.isBigEvent || false,
          triggeredByName: player?.name || "Someone",
        })
      }
    }
  }

  private handleHeistTarget(thiefId: string, targetId: string) {
    const result = this.engine.processHeistTarget(thiefId, targetId)
    const allPlayers = this.engine.getAllPlayers()

    if (result) {
      this.broadcast({ type: "HEIST_RESULT", result, allPlayers })
      this.checkIdentityTheftAfterInteractive(thiefId)
      
      // Always update host's UI with new player state
      this.emit({ type: "players_updated", allPlayers })
      
      // Show heist result modal to host if involved
      if (result.thiefId === this.myPlayerId) {
        this.emit({ type: "heist_result", data: result, isVictim: false, allPlayers })
      } else if (result.victimId === this.myPlayerId) {
        this.emit({ type: "heist_result", data: result, isVictim: true, allPlayers })
      }
    }
  }

  private handlePonziChoice(playerId: string, invest: boolean) {
    const result = this.engine.processPonziChoice(playerId, invest)
    const allPlayers = this.engine.getAllPlayers()

    if (result) {
      this.broadcast({ type: "PONZI_RESULT", result, allPlayers })
      this.checkIdentityTheftAfterInteractive(playerId)
      
      // Always update host's UI with new player state
      this.emit({ type: "players_updated", allPlayers })
      
      // Show ponzi result modal to host if they made the choice
      if (result.playerId === this.myPlayerId) {
        this.emit({ type: "ponzi_result", data: result, allPlayers })
      }
    }
  }

  private handlePoliceTarget(snitchId: string, targetId: string) {
    const result = this.engine.processPoliceTarget(snitchId, targetId)
    const allPlayers = this.engine.getAllPlayers()

    if (result) {
      this.broadcast({ type: "POLICE_RESULT", result, allPlayers })
      this.checkIdentityTheftAfterInteractive(snitchId)
      
      // Always update host's UI with new player state
      this.emit({ type: "players_updated", allPlayers })
      
      // Show police result modal to host if involved
      if (result.snitchId === this.myPlayerId) {
        this.emit({ type: "police_result", data: result, isVictim: false, allPlayers })
      } else if (result.victimId === this.myPlayerId) {
        this.emit({ type: "police_result", data: result, isVictim: true, allPlayers })
      }
    }
  }

  private handleSwapMeetTarget(swapperId: string, targetId: string) {
    const result = this.engine.processSwapMeetTarget(swapperId, targetId)
    const allPlayers = this.engine.getAllPlayers()

    if (result) {
      this.broadcast({ type: "SWAP_MEET_RESULT", result, allPlayers })
      // Note: No identity theft check after swap meet - swap already happened
      
      // Always update host's UI with new player state
      this.emit({ type: "players_updated", allPlayers })
      
      // Show swap meet result modal to host if involved
      if (result.swapperId === this.myPlayerId) {
        this.emit({ type: "swap_meet_result", data: result, isTarget: false, allPlayers })
      } else if (result.targetId === this.myPlayerId) {
        this.emit({ type: "swap_meet_result", data: result, isTarget: true, allPlayers })
      }
    }
  }

  private handleLeaveGame(playerId: string) {
    const leavingPlayer = this.engine.getPlayer(playerId)
    const playerName = leavingPlayer?.name || "Someone"
    
    // Clean up connection mappings
    const conn = this.connections.get(playerId)
    if (conn) {
      this.connectionToPlayer.delete(conn.peer)
    }
    
    this.engine.removePlayer(playerId)
    this.connections.delete(playerId)
    
    const allPlayers = this.engine.getAllPlayers()
    this.broadcast({ type: "PLAYER_LEFT", playerId, playerName, allPlayers })
    this.emit({ type: "player_left", playerId, allPlayers })
  }

  private checkIdentityTheftAfterInteractive(playerId: string) {
    const result = this.engine.checkIdentityTheftAfterInteractive(playerId)
    if (result) {
      const allPlayers = this.engine.getAllPlayers()
      
      this.broadcast({
        type: "IDENTITY_THEFT_EVENT",
        result,
        allPlayers,
      })
      
      // Always update host's UI with new player state (coins swapped)
      this.emit({ type: "players_updated", allPlayers })
      
      // Show identity theft modal to host if involved
      if (this.amInvolved(result.player1Id, result.player2Id)) {
        this.emit({
          type: "identity_theft",
          data: result,
          allPlayers,
        })
      }
    }
  }

  // ============================================================================
  // HOST-SIDE GAME ACTIONS (for host's own moves)
  // ============================================================================

  /** Submit answer (host's own action) */
  submitAnswer(questionIndex: number, answerIndex: number) {
    if (!this.myPlayerId) return

    const result = this.engine.submitAnswer(this.myPlayerId, questionIndex, answerIndex)
    if (result) {
      const allPlayers = this.engine.getAllPlayers()
      this.broadcast({
        type: "ANSWER_RESULT",
        playerId: this.myPlayerId,
        correct: result.correct,
        newCoins: result.newCoins,
        allPlayers,
      })
      this.emit({
        type: "answer_result",
        playerId: this.myPlayerId,
        correct: result.correct,
        newCoins: result.newCoins,
        allPlayers,
      })
    }
  }

  /** Advance to next question (host's own action) */
  advanceQuestion(wasCorrect: boolean): MoveResultForNetwork {
    if (!this.myPlayerId) {
      return { dieRoll: null, dieRolls: [], lapBonus: null, tileEvent: null }
    }

    const result = this.engine.advanceQuestion(this.myPlayerId, wasCorrect)
    if (!result) {
      return { dieRoll: null, dieRolls: [], lapBonus: null, tileEvent: null }
    }

    const allPlayers = this.engine.getAllPlayers()
    const myPlayer = allPlayers.find(p => p.id === this.myPlayerId)
    const hasInteractivePrompt = result.heistPrompt || result.ponziPrompt || result.policePrompt || result.swapMeetPrompt
    const tileEventToShow = hasInteractivePrompt ? null : result.tileEvent

    // Broadcast to guests
    this.broadcast({
      type: "MOVE_RESULT",
      playerId: this.myPlayerId,
      playerName: myPlayer?.name || "Host",
      dieRoll: result.dieRoll,
      dieRolls: result.dieRolls,
      lapBonus: result.lapBonus,
      tileEvent: tileEventToShow,
      allPlayers,
    })

    // Emit move_result to host's own UI (so animations trigger properly)
    this.emit({
      type: "move_result",
      playerId: this.myPlayerId,
      playerName: myPlayer?.name || "Host",
      dieRoll: result.dieRoll,
      dieRolls: result.dieRolls,
      lapBonus: result.lapBonus,
      tileEvent: tileEventToShow,
      allPlayers,
    })

    // Handle prompts for host
    if (result.heistPrompt) {
      this.emit({ type: "heist_prompt", data: result.heistPrompt })
    }
    if (result.ponziPrompt) {
      this.emit({ type: "ponzi_prompt", data: result.ponziPrompt })
    }
    if (result.policePrompt) {
      this.emit({ type: "police_prompt", data: result.policePrompt })
    }
    if (result.swapMeetPrompt) {
      this.emit({ type: "swap_meet_prompt", data: result.swapMeetPrompt })
    }

    // Handle identity theft
    if (result.identityTheftEvent) {
      this.broadcast({
        type: "IDENTITY_THEFT_EVENT",
        result: result.identityTheftEvent,
        allPlayers: this.engine.getAllPlayers(),
      })
      this.emit({
        type: "identity_theft",
        data: result.identityTheftEvent,
        allPlayers: this.engine.getAllPlayers(),
      })
    }

    const hasPrompt = result.heistPrompt || result.ponziPrompt || result.policePrompt || result.swapMeetPrompt
    return hasPrompt ? { ...result, tileEvent: null } : result
  }

  /** Select heist target (host's own action) */
  selectHeistTarget(targetId: string) {
    if (!this.myPlayerId) return
    this.handleHeistTarget(this.myPlayerId, targetId)
  }

  /** Make ponzi choice (host's own action) */
  makePonziChoice(invest: boolean) {
    if (!this.myPlayerId) return
    this.handlePonziChoice(this.myPlayerId, invest)
  }

  /** Select police target (host's own action) */
  selectPoliceTarget(targetId: string) {
    if (!this.myPlayerId) return
    this.handlePoliceTarget(this.myPlayerId, targetId)
  }

  /** Select swap meet target (host's own action) */
  selectSwapMeetTarget(targetId: string) {
    if (!this.myPlayerId) return
    this.handleSwapMeetTarget(this.myPlayerId, targetId)
  }

  /** Start the game */
  startGame() {
    const allPlayers = this.engine.startGame()
    this.broadcast({ type: "GAME_STARTED", allPlayers })
    this.emit({ type: "game_started", allPlayers })
  }

  /** Reset the game */
  resetGame() {
    this.engine.reset()
    this.broadcast({ type: "GAME_RESET" })
    this.emit({ type: "game_reset" })
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private broadcast(message: HostToGuestMessage) {
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(message)
      }
    })
  }

  /** Send a message to a specific player */
  private sendTo(playerId: string, message: HostToGuestMessage) {
    const conn = this.connections.get(playerId)
    if (conn?.open) {
      conn.send(message)
    }
  }

  private emit(event: NetworkEvent) {
    this.eventHandler(event)
  }

  private amInvolved(...playerIds: string[]): boolean {
    return playerIds.includes(this.myPlayerId || "")
  }

  get playerId() {
    return this.myPlayerId
  }

  getPlayers() {
    return this.engine.getAllPlayers()
  }
}
