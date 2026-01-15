/**
 * GuestClient - Network layer for game guests
 * 
 * Guests connect to the host and send action requests.
 * They receive state updates and events from the host.
 * 
 * RESPONSIBILITIES:
 * - Connect to host via PeerJS
 * - Send game actions to host
 * - Process incoming events from host
 * - Emit filtered events to local UI
 */

import Peer, { DataConnection } from "peerjs"
import type { GuestToHostMessage, HostToGuestMessage } from "../p2p-types"
import type { NetworkEvent, MoveResultForNetwork } from "./types"
import { PEER_CONFIG, roomCodeToPeerId } from "./types"

type EventHandler = (event: NetworkEvent) => void

export class GuestClient {
  private peer: Peer | null = null
  private connection: DataConnection | null = null
  private eventHandler: EventHandler
  private myPlayerId: string | null = null
  private pendingMoveResolve: ((result: MoveResultForNetwork) => void) | null = null

  constructor(eventHandler: EventHandler) {
    this.eventHandler = eventHandler
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /** Join an existing room */
  joinRoom(roomCode: string, playerName: string) {
    const hostPeerId = roomCodeToPeerId(roomCode)

    this.peer = new Peer(PEER_CONFIG)

    this.peer.on("open", () => {
      const conn = this.peer!.connect(hostPeerId, { reliable: true })
      this.connection = conn

      conn.on("open", () => {
        conn.send({ type: "JOIN_REQUEST", playerName } as GuestToHostMessage)
      })

      conn.on("data", (data) => {
        this.handleHostMessage(data as HostToGuestMessage)
      })

      conn.on("close", () => {
        this.emit({ type: "host_disconnected" })
        this.emit({ type: "disconnected" })
      })

      conn.on("error", () => {
        this.emit({ type: "error", message: "Failed to connect to room" })
      })
    })

    this.peer.on("error", (err) => {
      if (err.type === "peer-unavailable") {
        this.emit({ type: "error", message: "Room not found. Check the code and try again." })
      } else {
        this.emit({ type: "error", message: err.message })
      }
    })
  }

  /** Disconnect and clean up */
  disconnect() {
    if (this.myPlayerId && this.connection?.open) {
      this.send({ type: "LEAVE_GAME", playerId: this.myPlayerId })
    }
    this.connection?.close()
    this.peer?.destroy()
    this.peer = null
    this.connection = null
    this.resolvePendingMove(null)
    this.emit({ type: "disconnected" })
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  private handleHostMessage(message: HostToGuestMessage) {
    switch (message.type) {
      case "JOIN_ACCEPTED":
        this.myPlayerId = message.playerId
        this.emit({ type: "connected", roomCode: "" }) // Room code already known
        this.emit({
          type: "identity_assigned",
          playerId: message.playerId,
          player: message.player,
          allPlayers: message.allPlayers,
        })
        break

      case "JOIN_REJECTED":
        this.emit({ type: "error", message: message.reason })
        break

      case "PLAYER_JOINED":
        this.emit({
          type: "player_joined",
          playerId: "", // Not needed for other players
          player: message.player,
          allPlayers: message.allPlayers,
        })
        break

      case "PLAYER_LEFT":
        this.emit({
          type: "player_left",
          playerId: message.playerId,
          allPlayers: message.allPlayers,
        })
        break

      case "GAME_STARTED":
        this.emit({ type: "game_started", allPlayers: message.allPlayers })
        break

      case "STATE_UPDATE":
        this.emit({ type: "players_updated", allPlayers: message.allPlayers })
        break

      case "ANSWER_RESULT":
        // Only emit to UI if it's my answer
        if (message.playerId === this.myPlayerId) {
          this.emit({
            type: "answer_result",
            playerId: message.playerId,
            correct: message.correct,
            newCoins: message.newCoins,
            allPlayers: message.allPlayers,
          })
        }
        // Always update players list
        this.emit({ type: "players_updated", allPlayers: message.allPlayers })
        break

      case "MOVE_RESULT":
        this.emit({ type: "players_updated", allPlayers: message.allPlayers })
        
        if (message.playerId === this.myPlayerId) {
          // This is MY move result
          this.emit({
            type: "move_result",
            playerId: message.playerId,
            playerName: message.playerName,
            dieRoll: message.dieRoll,
            dieRolls: message.dieRolls,
            lapBonus: message.lapBonus,
            tileEvent: message.tileEvent,
            allPlayers: message.allPlayers,
          })
          
          // Resolve pending promise
          this.resolvePendingMove({
            dieRoll: message.dieRoll,
            dieRolls: message.dieRolls,
            lapBonus: message.lapBonus,
            tileEvent: message.tileEvent,
          })
        } else if (message.tileEvent?.isGlobal && message.tileEvent.impactedPlayers) {
          // Check if I was impacted
          const myImpact = message.tileEvent.impactedPlayers.find(p => p.id === this.myPlayerId)
          if (myImpact) {
            this.emit({
              type: "impacted_by_event",
              tileName: message.tileEvent.tileName,
              coinsDelta: myImpact.coinsDelta,
              isBigEvent: myImpact.isBigEvent || false,
              triggeredByName: message.playerName,
            })
          }
        }
        break

      case "HEIST_PROMPT":
        // Only for the player who needs to act
        if (message.playerId === this.myPlayerId) {
          this.emit({ type: "heist_prompt", data: message.heistData })
        }
        break

      case "HEIST_RESULT":
        this.emit({ type: "players_updated", allPlayers: message.allPlayers })
        // Only notify if I'm involved
        if (message.result.thiefId === this.myPlayerId) {
          this.emit({ type: "heist_result", data: message.result, isVictim: false, allPlayers: message.allPlayers })
        } else if (message.result.victimId === this.myPlayerId) {
          this.emit({ type: "heist_result", data: message.result, isVictim: true, allPlayers: message.allPlayers })
        }
        break

      case "PONZI_PROMPT":
        if (message.playerId === this.myPlayerId) {
          this.emit({ type: "ponzi_prompt", data: message.ponziData })
        }
        break

      case "PONZI_RESULT":
        this.emit({ type: "players_updated", allPlayers: message.allPlayers })
        if (message.result.playerId === this.myPlayerId) {
          this.emit({ type: "ponzi_result", data: message.result, allPlayers: message.allPlayers })
        }
        break

      case "POLICE_PROMPT":
        if (message.playerId === this.myPlayerId) {
          this.emit({ type: "police_prompt", data: message.policeData })
        }
        break

      case "POLICE_RESULT":
        this.emit({ type: "players_updated", allPlayers: message.allPlayers })
        if (message.result.snitchId === this.myPlayerId) {
          this.emit({ type: "police_result", data: message.result, isVictim: false, allPlayers: message.allPlayers })
        } else if (message.result.victimId === this.myPlayerId) {
          this.emit({ type: "police_result", data: message.result, isVictim: true, allPlayers: message.allPlayers })
        }
        break

      case "SWAP_MEET_PROMPT":
        if (message.playerId === this.myPlayerId) {
          this.emit({ type: "swap_meet_prompt", data: message.swapMeetData })
        }
        break

      case "SWAP_MEET_RESULT":
        this.emit({ type: "players_updated", allPlayers: message.allPlayers })
        if (message.result.swapperId === this.myPlayerId) {
          this.emit({ type: "swap_meet_result", data: message.result, isTarget: false, allPlayers: message.allPlayers })
        } else if (message.result.targetId === this.myPlayerId) {
          this.emit({ type: "swap_meet_result", data: message.result, isTarget: true, allPlayers: message.allPlayers })
        }
        break

      case "IDENTITY_THEFT_EVENT":
        this.emit({ type: "players_updated", allPlayers: message.allPlayers })
        // Only show modal if I'm involved
        if (message.result.player1Id === this.myPlayerId || message.result.player2Id === this.myPlayerId) {
          this.emit({ type: "identity_theft", data: message.result, allPlayers: message.allPlayers })
        }
        break

      case "GAME_RESET":
        this.emit({ type: "game_reset" })
        break

      case "HOST_DISCONNECTED":
        this.emit({ type: "host_disconnected" })
        break
    }
  }

  // ============================================================================
  // GAME ACTIONS
  // ============================================================================

  /** Submit an answer */
  submitAnswer(questionIndex: number, answerIndex: number) {
    if (!this.myPlayerId) return
    this.send({ type: "SUBMIT_ANSWER", playerId: this.myPlayerId, questionIndex, answerIndex })
  }

  /** Advance to next question (request to host) */
  advanceQuestion(wasCorrect: boolean): Promise<MoveResultForNetwork> {
    return new Promise((resolve) => {
      if (!this.myPlayerId) {
        resolve({ dieRoll: null, dieRolls: [], lapBonus: null, tileEvent: null })
        return
      }

      this.pendingMoveResolve = resolve
      this.send({ type: "NEXT_QUESTION", playerId: this.myPlayerId, wasCorrect })

      // Timeout protection
      setTimeout(() => {
        if (this.pendingMoveResolve === resolve) {
          console.warn("Move result timeout")
          this.resolvePendingMove(null)
        }
      }, 10000)
    })
  }

  /** Select heist target */
  selectHeistTarget(targetId: string) {
    if (!this.myPlayerId) return
    this.send({ type: "HEIST_TARGET_SELECTED", playerId: this.myPlayerId, targetPlayerId: targetId })
  }

  /** Make ponzi choice */
  makePonziChoice(invest: boolean) {
    if (!this.myPlayerId) return
    this.send({ type: "PONZI_CHOICE", playerId: this.myPlayerId, invest })
  }

  /** Select police target */
  selectPoliceTarget(targetId: string) {
    if (!this.myPlayerId) return
    this.send({ type: "POLICE_TARGET_SELECTED", playerId: this.myPlayerId, targetPlayerId: targetId })
  }

  /** Select swap meet target */
  selectSwapMeetTarget(targetId: string) {
    if (!this.myPlayerId) return
    this.send({ type: "SWAP_MEET_TARGET_SELECTED", playerId: this.myPlayerId, targetPlayerId: targetId })
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private send(message: GuestToHostMessage) {
    if (this.connection?.open) {
      this.connection.send(message)
    } else {
      console.error("Cannot send - connection not open", message.type)
    }
  }

  private emit(event: NetworkEvent) {
    this.eventHandler(event)
  }

  private resolvePendingMove(result: MoveResultForNetwork | null) {
    if (this.pendingMoveResolve) {
      this.pendingMoveResolve(result || { dieRoll: null, dieRolls: [], lapBonus: null, tileEvent: null })
      this.pendingMoveResolve = null
    }
  }

  get playerId() {
    return this.myPlayerId
  }
}
