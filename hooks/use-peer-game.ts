/**
 * usePeerGame - React hook for P2P game connectivity
 * 
 * This hook manages the WebRTC peer-to-peer connection using PeerJS.
 * 
 * ARCHITECTURE:
 * - Host: Creates a room, runs the game engine, processes all actions
 * - Guest: Joins a room, sends action requests to host, receives state updates
 * 
 * EVENT NOTIFICATION RULES:
 * - Prompts (heist, ponzi, police): ONLY shown to the player who must act
 * - Results (heist, ponzi, police): ONLY shown to involved players (actor + victim)
 * - Identity theft: ONLY shown to the two players who swapped
 * - Global events: Triggering player sees full event, impacted players see toast
 */

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Peer as PeerType, DataConnection } from "peerjs"
import type { Player } from "@/lib/types"
import type {
  RoomState,
  GuestToHostMessage,
  HostToGuestMessage,
  TileEventData,
  HeistPromptData,
  HeistResultData,
  PonziPromptData,
  PonziResultData,
  PolicePromptData,
  PoliceResultData,
  IdentityTheftResultData,
} from "@/lib/p2p-types"
import { P2PGameEngine, type MoveResult } from "@/lib/p2p-game-engine"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Generate a 6-character room code */
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Avoid ambiguous chars (I,O,0,1)
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/** Convert room code to PeerJS peer ID */
function roomCodeToPeerId(code: string): string {
  return `wayoflife-${code.toUpperCase()}`
}

// PeerJS server configuration
const peerConfig = {
  host: 'peer-server-wg.up.railway.app',
  port: 443,
  path: '/',
  key: 'peerjs',
  secure: true,
}

// ============================================================================
// TYPES
// ============================================================================

/** Move result formatted for UI consumption */
export interface MoveResultForUI {
  dieRoll: number | null
  dieRolls?: number[]
  lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
  tileEvent: TileEventData | null
  heistPrompt?: HeistPromptData
  ponziPrompt?: PonziPromptData
  policePrompt?: PolicePromptData
  identityTheftEvent?: IdentityTheftResultData
}

/** Callbacks for game events */
interface UsePeerGameOptions {
  onPlayersUpdate?: (players: Player[]) => void
  onGameStarted?: () => void
  onAnswerResult?: (result: { playerId: string; correct: boolean; newCoins: number }) => void
  onMoveResult?: (result: MoveResultForUI & { playerId: string }) => void
  // Interactive prompts - only called for the player who needs to act
  onHeistPrompt?: (data: HeistPromptData) => void
  onPonziPrompt?: (data: PonziPromptData) => void
  onPolicePrompt?: (data: PolicePromptData) => void
  // Results - only called for involved players
  onHeistResult?: (result: HeistResultData, isVictim: boolean) => void
  onPonziResult?: (result: PonziResultData) => void
  onPoliceResult?: (result: PoliceResultData, isVictim: boolean) => void
  onIdentityTheftEvent?: (result: IdentityTheftResultData) => void
  // Impact notifications for global events affecting this player
  onImpactedByEvent?: (event: { 
    tileName: string
    tileText: string
    coinsDelta: number
    isBigEvent: boolean
    triggeredByName: string 
  }) => void
  onGameReset?: () => void
  onError?: (error: string) => void
  onHostDisconnected?: () => void
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function usePeerGame(options: UsePeerGameOptions = {}) {
  // Room and connection state
  const [roomState, setRoomState] = useState<RoomState>({
    roomCode: "",
    role: "guest",
    connectionState: "disconnected",
    players: [],
    gameStarted: false,
  })
  
  // Player identity
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)

  // Refs to avoid stale closures in event handlers
  const peerRef = useRef<PeerType | null>(null)
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map())
  const hostConnectionRef = useRef<DataConnection | null>(null)
  const gameEngineRef = useRef<P2PGameEngine | null>(null)
  const pendingMoveResolverRef = useRef<((result: MoveResultForUI) => void) | null>(null)
  const myPlayerIdRef = useRef<string | null>(null)
  const optionsRef = useRef(options)

  // Keep refs in sync
  useEffect(() => {
    myPlayerIdRef.current = myPlayerId
  }, [myPlayerId])

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // ============================================================================
  // COMMUNICATION HELPERS
  // ============================================================================

  /** Broadcast a message to all connected guests */
  const broadcastToGuests = useCallback((message: HostToGuestMessage) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(message)
      }
    })
  }, [])

  /** Send a message to the host (guest only) */
  const sendToHost = useCallback((message: GuestToHostMessage) => {
    if (hostConnectionRef.current?.open) {
      hostConnectionRef.current.send(message)
    } else {
      console.error("Cannot send to host - connection not open", message.type)
    }
  }, [])

  /** Update local player state from allPlayers list */
  const updateMyPlayer = useCallback((allPlayers: Player[]) => {
    const currentPlayerId = myPlayerIdRef.current
    if (currentPlayerId) {
      const updated = allPlayers.find((p) => p.id === currentPlayerId)
      if (updated) {
        setMyPlayer(updated)
      }
    }
  }, [])

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================

  /**
   * Handle message from a guest (HOST ONLY)
   * Processes game actions and broadcasts results
   */
  const handleGuestMessage = useCallback(
    (message: GuestToHostMessage, conn: DataConnection) => {
      if (!gameEngineRef.current) return

      const engine = gameEngineRef.current
      const opts = optionsRef.current
      const myId = myPlayerIdRef.current

      switch (message.type) {
        case "JOIN_REQUEST": {
          // Generate unique player ID and add to game
          const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const player = engine.addPlayer(playerId, message.playerName)
          const allPlayers = engine.getAllPlayers()

          // Store player ID in connection metadata
          ;(conn as any).metadata = { playerId }
          connectionsRef.current.set(playerId, conn)

          // Notify the joining player
          conn.send({ type: "JOIN_ACCEPTED", playerId, player, allPlayers })

          // Notify other players
          connectionsRef.current.forEach((c, id) => {
            if (id !== playerId && c.open) {
              c.send({ type: "PLAYER_JOINED", player, allPlayers })
            }
          })

          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          opts.onPlayersUpdate?.(allPlayers)
          break
        }

        case "SUBMIT_ANSWER": {
          const result = engine.submitAnswer(message.playerId, message.questionIndex, message.answerIndex)
          if (result) {
            const allPlayers = engine.getAllPlayers()
            broadcastToGuests({
              type: "ANSWER_RESULT",
              playerId: message.playerId,
              correct: result.correct,
              newCoins: result.newCoins,
              allPlayers,
            })
            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            opts.onPlayersUpdate?.(allPlayers)
          }
          break
        }

        case "NEXT_QUESTION": {
          const result = engine.advanceQuestion(message.playerId, message.wasCorrect)
          if (!result) break

          const allPlayers = engine.getAllPlayers()
          const triggerPlayer = allPlayers.find(p => p.id === message.playerId)
          const hasInteractivePrompt = result.heistPrompt || result.ponziPrompt || result.policePrompt

          // Broadcast move result (exclude tileEvent if interactive prompt pending)
          broadcastToGuests({
            type: "MOVE_RESULT",
            playerId: message.playerId,
            playerName: triggerPlayer?.name || "Someone",
            dieRoll: result.dieRoll,
            dieRolls: result.dieRolls,
            lapBonus: result.lapBonus,
            tileEvent: hasInteractivePrompt ? null : result.tileEvent,
            allPlayers,
          })

          // Send interactive prompts only to the relevant player
          if (result.heistPrompt) {
            broadcastToGuests({ type: "HEIST_PROMPT", playerId: message.playerId, heistData: result.heistPrompt })
          }
          if (result.ponziPrompt) {
            broadcastToGuests({ type: "PONZI_PROMPT", playerId: message.playerId, ponziData: result.ponziPrompt })
          }
          if (result.policePrompt) {
            broadcastToGuests({ type: "POLICE_PROMPT", playerId: message.playerId, policeData: result.policePrompt })
          }

          // Send identity theft event to both involved players
          if (result.identityTheftEvent) {
            broadcastToGuests({
              type: "IDENTITY_THEFT_EVENT",
              result: result.identityTheftEvent,
              allPlayers: engine.getAllPlayers(),
            })
            // If host is involved, notify directly
            if (result.identityTheftEvent.player1Id === myId || result.identityTheftEvent.player2Id === myId) {
              opts.onIdentityTheftEvent?.(result.identityTheftEvent)
            }
          }

          // If host is impacted by a global event, notify
          if (!hasInteractivePrompt && result.tileEvent?.isGlobal && result.tileEvent.impactedPlayers) {
            const myImpact = result.tileEvent.impactedPlayers.find(p => p.id === myId)
            if (myImpact) {
              opts.onImpactedByEvent?.({
                tileName: result.tileEvent.tileName,
                tileText: result.tileEvent.tileText,
                coinsDelta: myImpact.coinsDelta,
                isBigEvent: myImpact.isBigEvent || false,
                triggeredByName: triggerPlayer?.name || "Someone",
              })
            }
          }

          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          opts.onPlayersUpdate?.(allPlayers)
          break
        }

        case "HEIST_TARGET_SELECTED": {
          const result = engine.processHeistTarget(message.playerId, message.targetPlayerId)
          const allPlayers = engine.getAllPlayers()

          if (result) {
            broadcastToGuests({ type: "HEIST_RESULT", result, allPlayers })

            // Check for identity theft after heist
            const identityTheftResult = engine.checkIdentityTheftAfterInteractive(message.playerId)
            if (identityTheftResult) {
              broadcastToGuests({
                type: "IDENTITY_THEFT_EVENT",
                result: identityTheftResult,
                allPlayers: engine.getAllPlayers(),
              })
              // Notify host if involved
              if (identityTheftResult.player1Id === myId || identityTheftResult.player2Id === myId) {
                opts.onIdentityTheftEvent?.(identityTheftResult)
              }
            }

            // Notify host if they were the thief or victim
            if (result.thiefId === myId) {
              opts.onHeistResult?.(result, false)
            } else if (result.victimId === myId) {
              opts.onHeistResult?.(result, true)
            }

            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            opts.onPlayersUpdate?.(allPlayers)
          } else {
            // Heist failed (no pending state) - send empty result to unblock
            console.warn("Heist processing failed, sending empty result")
            const player = engine.getPlayer(message.playerId)
            conn.send({
              type: "HEIST_RESULT",
              result: { 
                thiefId: message.playerId, 
                thiefName: player?.name || "Unknown", 
                victimId: "", 
                victimName: "Nobody", 
                amountStolen: 0 
              },
              allPlayers,
            })
          }
          break
        }

        case "PONZI_CHOICE": {
          const result = engine.processPonziChoice(message.playerId, message.invest)
          const allPlayers = engine.getAllPlayers()

          if (result) {
            broadcastToGuests({ type: "PONZI_RESULT", result, allPlayers })

            // Check for identity theft after ponzi
            const identityTheftResult = engine.checkIdentityTheftAfterInteractive(message.playerId)
            if (identityTheftResult) {
              broadcastToGuests({
                type: "IDENTITY_THEFT_EVENT",
                result: identityTheftResult,
                allPlayers: engine.getAllPlayers(),
              })
              if (identityTheftResult.player1Id === myId || identityTheftResult.player2Id === myId) {
                opts.onIdentityTheftEvent?.(identityTheftResult)
              }
            }

            // Notify host if they were the gambler
            if (result.playerId === myId) {
              opts.onPonziResult?.(result)
            }

            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            opts.onPlayersUpdate?.(allPlayers)
          } else {
            console.warn("Ponzi processing failed, sending empty result")
            const player = engine.getPlayer(message.playerId)
            conn.send({
              type: "PONZI_RESULT",
              result: { playerId: message.playerId, playerName: player?.name || "Unknown", invested: false },
              allPlayers,
            })
          }
          break
        }

        case "POLICE_TARGET_SELECTED": {
          const result = engine.processPoliceTarget(message.playerId, message.targetPlayerId)
          const allPlayers = engine.getAllPlayers()

          if (result) {
            broadcastToGuests({ type: "POLICE_RESULT", result, allPlayers })

            // Check for identity theft after police
            const identityTheftResult = engine.checkIdentityTheftAfterInteractive(message.playerId)
            if (identityTheftResult) {
              broadcastToGuests({
                type: "IDENTITY_THEFT_EVENT",
                result: identityTheftResult,
                allPlayers: engine.getAllPlayers(),
              })
              if (identityTheftResult.player1Id === myId || identityTheftResult.player2Id === myId) {
                opts.onIdentityTheftEvent?.(identityTheftResult)
              }
            }

            // Notify host if they were snitch or victim
            if (result.snitchId === myId) {
              opts.onPoliceResult?.(result, false)
            } else if (result.victimId === myId) {
              opts.onPoliceResult?.(result, true)
            }

            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            opts.onPlayersUpdate?.(allPlayers)
          } else {
            console.warn("Police processing failed, sending empty result")
            const player = engine.getPlayer(message.playerId)
            conn.send({
              type: "POLICE_RESULT",
              result: { 
                snitchId: message.playerId, 
                snitchName: player?.name || "Unknown", 
                victimId: "", 
                victimName: "Nobody", 
                coinsLost: 0 
              },
              allPlayers,
            })
          }
          break
        }

        case "LEAVE_GAME": {
          const leavingPlayer = engine.getPlayer(message.playerId)
          const playerName = leavingPlayer?.name || "Someone"
          engine.removePlayer(message.playerId)
          connectionsRef.current.delete(message.playerId)
          const allPlayers = engine.getAllPlayers()
          broadcastToGuests({ type: "PLAYER_LEFT", playerId: message.playerId, playerName, allPlayers })
          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          opts.onPlayersUpdate?.(allPlayers)
          break
        }
      }
    },
    [broadcastToGuests]
  )

  /**
   * Handle message from the host (GUEST ONLY)
   * Updates local state based on game events
   */
  const handleHostMessage = useCallback(
    (message: HostToGuestMessage) => {
      const opts = optionsRef.current
      const myId = myPlayerIdRef.current

      switch (message.type) {
        case "JOIN_ACCEPTED":
          setMyPlayerId(message.playerId)
          myPlayerIdRef.current = message.playerId
          setMyPlayer(message.player)
          setRoomState((prev) => ({ ...prev, connectionState: "connected", players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          break

        case "JOIN_REJECTED":
          opts.onError?.(message.reason)
          setRoomState((prev) => ({ ...prev, connectionState: "error" }))
          break

        case "PLAYER_JOINED":
        case "PLAYER_LEFT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          break

        case "GAME_STARTED":
          setRoomState((prev) => ({ ...prev, gameStarted: true, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          opts.onGameStarted?.()
          break

        case "STATE_UPDATE":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          break

        case "ANSWER_RESULT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          // Only notify the player who answered
          if (message.playerId === myId) {
            opts.onAnswerResult?.({ playerId: message.playerId, correct: message.correct, newCoins: message.newCoins })
          }
          updateMyPlayer(message.allPlayers)
          break

        case "MOVE_RESULT": {
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)

          if (message.playerId === myId) {
            // This is MY move - show full results
            const moveResult: MoveResultForUI = {
              dieRoll: message.dieRoll,
              dieRolls: message.dieRolls,
              lapBonus: message.lapBonus,
              tileEvent: message.tileEvent,
            }
            opts.onMoveResult?.({ playerId: message.playerId, ...moveResult })
            
            // Resolve pending move promise
            if (pendingMoveResolverRef.current) {
              pendingMoveResolverRef.current(moveResult)
              pendingMoveResolverRef.current = null
            }
          } else if (message.tileEvent?.isGlobal && message.tileEvent.impactedPlayers) {
            // Check if I was impacted by this global event
            const myImpact = message.tileEvent.impactedPlayers.find(p => p.id === myId)
            if (myImpact) {
              opts.onImpactedByEvent?.({
                tileName: message.tileEvent.tileName,
                tileText: message.tileEvent.tileText,
                coinsDelta: myImpact.coinsDelta,
                isBigEvent: myImpact.isBigEvent || false,
                triggeredByName: message.playerName,
              })
            }
            // Non-impacted players see nothing
          }
          updateMyPlayer(message.allPlayers)
          break
        }

        case "HEIST_PROMPT":
          // Only show to the player who needs to act
          if (message.playerId === myId) {
            opts.onHeistPrompt?.(message.heistData)
          }
          break

        case "HEIST_RESULT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          // Only notify thief and victim
          if (message.result.thiefId === myId) {
            opts.onHeistResult?.(message.result, false)
          } else if (message.result.victimId === myId) {
            opts.onHeistResult?.(message.result, true)
          }
          updateMyPlayer(message.allPlayers)
          break

        case "PONZI_PROMPT":
          if (message.playerId === myId) {
            opts.onPonziPrompt?.(message.ponziData)
          }
          break

        case "PONZI_RESULT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          // Only notify the gambler
          if (message.result.playerId === myId) {
            opts.onPonziResult?.(message.result)
          }
          updateMyPlayer(message.allPlayers)
          break

        case "POLICE_PROMPT":
          if (message.playerId === myId) {
            opts.onPolicePrompt?.(message.policeData)
          }
          break

        case "POLICE_RESULT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          // Only notify snitch and victim
          if (message.result.snitchId === myId) {
            opts.onPoliceResult?.(message.result, false)
          } else if (message.result.victimId === myId) {
            opts.onPoliceResult?.(message.result, true)
          }
          updateMyPlayer(message.allPlayers)
          break

        case "IDENTITY_THEFT_EVENT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          // Only notify the two players involved in the swap
          if (message.result.player1Id === myId || message.result.player2Id === myId) {
            opts.onIdentityTheftEvent?.(message.result)
          }
          updateMyPlayer(message.allPlayers)
          break

        case "GAME_RESET":
          opts.onGameReset?.()
          break

        case "HOST_DISCONNECTED":
          opts.onHostDisconnected?.()
          setRoomState((prev) => ({ ...prev, connectionState: "error" }))
          break
      }
    },
    [updateMyPlayer]
  )

  // ============================================================================
  // ROOM MANAGEMENT
  // ============================================================================

  /** Create a new game room as host */
  const createRoom = useCallback(
    async (hostName: string) => {
      const roomCode = generateRoomCode()
      const peerId = roomCodeToPeerId(roomCode)

      setRoomState((prev) => ({ ...prev, roomCode, role: "host", connectionState: "connecting", hostName }))

      // Initialize game engine
      gameEngineRef.current = new P2PGameEngine()

      // Dynamically import PeerJS to avoid SSR issues
      const { default: Peer } = await import("peerjs")
      
      // Create peer connection
      const peer = new Peer(peerId, peerConfig)
      peerRef.current = peer

      peer.on("open", () => {
        // Add host as first player
        const hostPlayerId = `host-${Date.now()}`
        const hostPlayer = gameEngineRef.current!.addPlayer(hostPlayerId, hostName)
        setMyPlayerId(hostPlayerId)
        myPlayerIdRef.current = hostPlayerId
        setMyPlayer(hostPlayer)

        const allPlayers = gameEngineRef.current!.getAllPlayers()
        setRoomState((prev) => ({ ...prev, connectionState: "connected", players: allPlayers }))
        optionsRef.current.onPlayersUpdate?.(allPlayers)
      })

      peer.on("connection", (conn) => {
        conn.on("data", (data) => handleGuestMessage(data as GuestToHostMessage, conn))
        conn.on("close", () => {
          // Handle guest disconnection
          const metadata = (conn as any).metadata
          const playerId = metadata?.playerId
          if (playerId && gameEngineRef.current) {
            const leavingPlayer = gameEngineRef.current.getPlayer(playerId)
            const playerName = leavingPlayer?.name || "Someone"
            gameEngineRef.current.removePlayer(playerId)
            connectionsRef.current.delete(playerId)
            const allPlayers = gameEngineRef.current.getAllPlayers()
            broadcastToGuests({ type: "PLAYER_LEFT", playerId, playerName, allPlayers })
            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            optionsRef.current.onPlayersUpdate?.(allPlayers)
          }
        })
      })

      peer.on("error", (err) => {
        console.error("PeerJS error:", err)
        optionsRef.current.onError?.(err.message)
        setRoomState((prev) => ({ ...prev, connectionState: "error" }))
      })
    },
    [broadcastToGuests, handleGuestMessage]
  )

  /** Join an existing room as guest */
  const joinRoom = useCallback(
    async (roomCode: string, playerName: string) => {
      const peerId = roomCodeToPeerId(roomCode)
      setRoomState((prev) => ({ ...prev, roomCode: roomCode.toUpperCase(), role: "guest", connectionState: "connecting" }))

      // Dynamically import PeerJS to avoid SSR issues
      const { default: Peer } = await import("peerjs")
      
      const peer = new Peer(peerConfig)
      peerRef.current = peer

      peer.on("open", () => {
        const conn = peer.connect(peerId, { reliable: true })
        hostConnectionRef.current = conn

        conn.on("open", () => conn.send({ type: "JOIN_REQUEST", playerName }))
        conn.on("data", (data) => handleHostMessage(data as HostToGuestMessage))
        conn.on("close", () => {
          optionsRef.current.onHostDisconnected?.()
          setRoomState((prev) => ({ ...prev, connectionState: "disconnected" }))
        })
        conn.on("error", () => {
          optionsRef.current.onError?.("Failed to connect to room")
          setRoomState((prev) => ({ ...prev, connectionState: "error" }))
        })
      })

      peer.on("error", (err) => {
        if (err.type === "peer-unavailable") {
          optionsRef.current.onError?.("Room not found. Check the code and try again.")
        } else {
          optionsRef.current.onError?.(err.message)
        }
        setRoomState((prev) => ({ ...prev, connectionState: "error" }))
      })
    },
    [handleHostMessage]
  )

  // ============================================================================
  // GAME ACTIONS
  // ============================================================================

  /** Start the game (host only) */
  const startGame = useCallback(() => {
    if (roomState.role !== "host" || !gameEngineRef.current) return
    const allPlayers = gameEngineRef.current.startGame()
    broadcastToGuests({ type: "GAME_STARTED", allPlayers })
    setRoomState((prev) => ({ ...prev, gameStarted: true, players: allPlayers }))
    options.onPlayersUpdate?.(allPlayers)
    options.onGameStarted?.()
  }, [broadcastToGuests, options, roomState.role])

  /** Submit an answer to the current question */
  const submitAnswer = useCallback(
    (questionIndex: number, answerIndex: number) => {
      if (!myPlayerId) return

      if (roomState.role === "host" && gameEngineRef.current) {
        const result = gameEngineRef.current.submitAnswer(myPlayerId, questionIndex, answerIndex)
        if (result) {
          const allPlayers = gameEngineRef.current.getAllPlayers()
          broadcastToGuests({
            type: "ANSWER_RESULT",
            playerId: myPlayerId,
            correct: result.correct,
            newCoins: result.newCoins,
            allPlayers,
          })
          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          options.onPlayersUpdate?.(allPlayers)
          options.onAnswerResult?.({ playerId: myPlayerId, correct: result.correct, newCoins: result.newCoins })
          updateMyPlayer(allPlayers)
        }
      } else {
        sendToHost({ type: "SUBMIT_ANSWER", playerId: myPlayerId, questionIndex, answerIndex })
      }
    },
    [broadcastToGuests, myPlayerId, options, roomState.role, sendToHost, updateMyPlayer]
  )

  /** Advance to next question (rolls dice if correct) */
  const advanceQuestion = useCallback(
    (wasCorrect: boolean): Promise<MoveResultForUI> => {
      return new Promise((resolve) => {
        if (!myPlayerId) {
          resolve({ dieRoll: null, lapBonus: null, tileEvent: null })
          return
        }

        if (roomState.role === "host" && gameEngineRef.current) {
          const result = gameEngineRef.current.advanceQuestion(myPlayerId, wasCorrect)
          if (!result) {
            resolve({ dieRoll: null, lapBonus: null, tileEvent: null })
            return
          }

          const allPlayers = gameEngineRef.current.getAllPlayers()
          const myPlayer = allPlayers.find(p => p.id === myPlayerId)
          const hasInteractivePrompt = result.heistPrompt || result.ponziPrompt || result.policePrompt

          // Broadcast to guests
          broadcastToGuests({
            type: "MOVE_RESULT",
            playerId: myPlayerId,
            playerName: myPlayer?.name || "Host",
            dieRoll: result.dieRoll,
            dieRolls: result.dieRolls,
            lapBonus: result.lapBonus,
            tileEvent: hasInteractivePrompt ? null : result.tileEvent,
            allPlayers,
          })

          // Handle interactive prompts
          if (result.heistPrompt) options.onHeistPrompt?.(result.heistPrompt)
          if (result.ponziPrompt) options.onPonziPrompt?.(result.ponziPrompt)
          if (result.policePrompt) options.onPolicePrompt?.(result.policePrompt)

          // Handle identity theft
          if (result.identityTheftEvent) {
            broadcastToGuests({
              type: "IDENTITY_THEFT_EVENT",
              result: result.identityTheftEvent,
              allPlayers: gameEngineRef.current.getAllPlayers(),
            })
            options.onIdentityTheftEvent?.(result.identityTheftEvent)
          }

          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          options.onPlayersUpdate?.(allPlayers)

          const resultForUI = hasInteractivePrompt ? { ...result, tileEvent: null } : result
          options.onMoveResult?.({ playerId: myPlayerId, ...resultForUI })
          updateMyPlayer(allPlayers)
          resolve(resultForUI)
        } else {
          // Guest: send to host and wait for response
          pendingMoveResolverRef.current = resolve
          sendToHost({ type: "NEXT_QUESTION", playerId: myPlayerId, wasCorrect })
          
          // Timeout to prevent getting stuck
          setTimeout(() => {
            if (pendingMoveResolverRef.current === resolve) {
              console.warn("Move result timeout - resolving with empty result")
              pendingMoveResolverRef.current = null
              resolve({ dieRoll: null, lapBonus: null, tileEvent: null })
            }
          }, 10000)
        }
      })
    },
    [broadcastToGuests, myPlayerId, options, roomState.role, sendToHost, updateMyPlayer]
  )

  /** Select a target for heist */
  const selectHeistTarget = useCallback(
    (targetPlayerId: string) => {
      if (!myPlayerId) return

      if (roomState.role === "host" && gameEngineRef.current) {
        const result = gameEngineRef.current.processHeistTarget(myPlayerId, targetPlayerId)
        if (result) {
          const allPlayers = gameEngineRef.current.getAllPlayers()
          broadcastToGuests({ type: "HEIST_RESULT", result, allPlayers })

          // Check for identity theft
          const identityTheftResult = gameEngineRef.current.checkIdentityTheftAfterInteractive(myPlayerId)
          if (identityTheftResult) {
            broadcastToGuests({
              type: "IDENTITY_THEFT_EVENT",
              result: identityTheftResult,
              allPlayers: gameEngineRef.current.getAllPlayers(),
            })
            options.onIdentityTheftEvent?.(identityTheftResult)
          }

          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          options.onPlayersUpdate?.(allPlayers)
          options.onHeistResult?.(result, false) // Host is the thief
          updateMyPlayer(allPlayers)
        } else {
          console.error("Heist failed - no pending state")
          // Still need to dismiss the modal
          options.onHeistResult?.(
            { thiefId: myPlayerId, thiefName: "You", victimId: "", victimName: "Nobody", amountStolen: 0 },
            false
          )
        }
      } else {
        sendToHost({ type: "HEIST_TARGET_SELECTED", playerId: myPlayerId, targetPlayerId })
      }
    },
    [broadcastToGuests, myPlayerId, options, roomState.role, sendToHost, updateMyPlayer]
  )

  /** Make a choice on the Ponzi/gamble tile */
  const makePonziChoice = useCallback(
    (invest: boolean, spinResult?: boolean) => {
      if (!myPlayerId) return

      if (roomState.role === "host" && gameEngineRef.current) {
        const result = gameEngineRef.current.processPonziChoice(myPlayerId, invest, spinResult)
        if (result) {
          const allPlayers = gameEngineRef.current.getAllPlayers()
          broadcastToGuests({ type: "PONZI_RESULT", result, allPlayers })

          // Check for identity theft
          const identityTheftResult = gameEngineRef.current.checkIdentityTheftAfterInteractive(myPlayerId)
          if (identityTheftResult) {
            broadcastToGuests({
              type: "IDENTITY_THEFT_EVENT",
              result: identityTheftResult,
              allPlayers: gameEngineRef.current.getAllPlayers(),
            })
            options.onIdentityTheftEvent?.(identityTheftResult)
          }

          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          options.onPlayersUpdate?.(allPlayers)
          options.onPonziResult?.(result)
          updateMyPlayer(allPlayers)
        } else {
          console.error("Ponzi failed - no pending state")
          options.onPonziResult?.({ playerId: myPlayerId, playerName: "You", invested: false })
        }
      } else {
        sendToHost({ type: "PONZI_CHOICE", playerId: myPlayerId, invest, spinResult })
      }
    },
    [broadcastToGuests, myPlayerId, options, roomState.role, sendToHost, updateMyPlayer]
  )

  /** Select a target to report at police station */
  const selectPoliceTarget = useCallback(
    (targetPlayerId: string) => {
      if (!myPlayerId) return

      if (roomState.role === "host" && gameEngineRef.current) {
        const result = gameEngineRef.current.processPoliceTarget(myPlayerId, targetPlayerId)
        if (result) {
          const allPlayers = gameEngineRef.current.getAllPlayers()
          broadcastToGuests({ type: "POLICE_RESULT", result, allPlayers })

          // Check for identity theft
          const identityTheftResult = gameEngineRef.current.checkIdentityTheftAfterInteractive(myPlayerId)
          if (identityTheftResult) {
            broadcastToGuests({
              type: "IDENTITY_THEFT_EVENT",
              result: identityTheftResult,
              allPlayers: gameEngineRef.current.getAllPlayers(),
            })
            options.onIdentityTheftEvent?.(identityTheftResult)
          }

          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          options.onPlayersUpdate?.(allPlayers)
          options.onPoliceResult?.(result, false) // Host is snitch
          updateMyPlayer(allPlayers)
        } else {
          console.error("Police failed - no pending state")
          options.onPoliceResult?.(
            { snitchId: myPlayerId, snitchName: "You", victimId: "", victimName: "Nobody", coinsLost: 0 },
            false
          )
        }
      } else {
        sendToHost({ type: "POLICE_TARGET_SELECTED", playerId: myPlayerId, targetPlayerId })
      }
    },
    [broadcastToGuests, myPlayerId, options, roomState.role, sendToHost, updateMyPlayer]
  )

  /** Reset the game (host only) */
  const resetGame = useCallback(() => {
    if (roomState.role !== "host" || !gameEngineRef.current) return
    gameEngineRef.current.reset()
    
    // Cancel any pending promises
    if (pendingMoveResolverRef.current) {
      pendingMoveResolverRef.current({ dieRoll: null, lapBonus: null, tileEvent: null })
      pendingMoveResolverRef.current = null
    }
    
    broadcastToGuests({ type: "GAME_RESET" })
    setRoomState((prev) => ({ ...prev, players: [], gameStarted: false }))
    options.onGameReset?.()
  }, [broadcastToGuests, options, roomState.role])

  /** Leave the current game */
  const leaveGame = useCallback(() => {
    if (roomState.role === "guest" && myPlayerId) {
      sendToHost({ type: "LEAVE_GAME", playerId: myPlayerId })
    }
    
    // Cancel any pending promises
    if (pendingMoveResolverRef.current) {
      pendingMoveResolverRef.current({ dieRoll: null, lapBonus: null, tileEvent: null })
      pendingMoveResolverRef.current = null
    }
    
    // Clean up connections
    peerRef.current?.destroy()
    peerRef.current = null
    hostConnectionRef.current = null
    connectionsRef.current.clear()
    gameEngineRef.current = null
    
    // Reset state
    setRoomState({ roomCode: "", role: "guest", connectionState: "disconnected", players: [], gameStarted: false })
    setMyPlayerId(null)
    myPlayerIdRef.current = null
    setMyPlayer(null)
  }, [myPlayerId, roomState.role, sendToHost])

  // Cleanup on unmount
  useEffect(() => {
    return () => { peerRef.current?.destroy() }
  }, [])

  return {
    roomState,
    myPlayerId,
    myPlayer,
    createRoom,
    joinRoom,
    startGame,
    submitAnswer,
    advanceQuestion,
    selectHeistTarget,
    makePonziChoice,
    selectPoliceTarget,
    resetGame,
    leaveGame,
  }
}
