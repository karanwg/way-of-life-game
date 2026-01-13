"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Peer, { DataConnection } from "peerjs"
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
  MarriageResultData,
} from "@/lib/p2p-types"
import { P2PGameEngine, type MoveResult } from "@/lib/p2p-game-engine"

// Generate a short room code from peer ID
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Convert room code to peer ID format
function roomCodeToPeerId(code: string): string {
  return `wayoflife-${code.toUpperCase()}`
}

export interface MoveResultForUI {
  dieRoll: number | null
  skippedDueToJail: boolean
  lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
  tileEvent: TileEventData | null
  heistPrompt?: HeistPromptData
  ponziPrompt?: PonziPromptData
  marriageEvent?: MarriageResultData
  jailApplied?: boolean
}

interface UsePeerGameOptions {
  onPlayersUpdate?: (players: Player[]) => void
  onGameStarted?: () => void
  onAnswerResult?: (result: { playerId: string; correct: boolean; newCoins: number }) => void
  onMoveResult?: (result: MoveResultForUI & { playerId: string }) => void
  onHeistPrompt?: (data: HeistPromptData) => void
  onHeistResult?: (result: HeistResultData) => void
  onPonziPrompt?: (data: PonziPromptData) => void
  onPonziResult?: (result: PonziResultData) => void
  onMarriageEvent?: (result: MarriageResultData) => void
  onJailApplied?: (playerName: string) => void
  onGameReset?: () => void
  onError?: (error: string) => void
  onHostDisconnected?: () => void
}

export function usePeerGame(options: UsePeerGameOptions = {}) {
  const [roomState, setRoomState] = useState<RoomState>({
    roomCode: "",
    role: "guest",
    connectionState: "disconnected",
    players: [],
    gameStarted: false,
  })
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)

  const peerRef = useRef<Peer | null>(null)
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map())
  const hostConnectionRef = useRef<DataConnection | null>(null)
  const gameEngineRef = useRef<P2PGameEngine | null>(null)

  // Pending request resolvers for async P2P calls
  const pendingMoveResolverRef = useRef<((result: MoveResultForUI) => void) | null>(null)
  
  // Refs to keep latest values accessible in event handlers
  const myPlayerIdRef = useRef<string | null>(null)
  const optionsRef = useRef(options)
  
  // Keep refs updated
  useEffect(() => {
    myPlayerIdRef.current = myPlayerId
  }, [myPlayerId])
  
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Broadcast message to all connected guests (host only)
  const broadcastToGuests = useCallback((message: HostToGuestMessage) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(message)
      }
    })
  }, [])

  // Send message to host (guest only)
  const sendToHost = useCallback((message: GuestToHostMessage) => {
    if (hostConnectionRef.current?.open) {
      hostConnectionRef.current.send(message)
    } else {
      console.error("Cannot send to host - connection not open", message.type)
    }
  }, [])

  // Helper to update my player from allPlayers - uses ref to avoid stale closure
  const updateMyPlayer = useCallback((allPlayers: Player[]) => {
    const currentPlayerId = myPlayerIdRef.current
    if (currentPlayerId) {
      const updated = allPlayers.find((p) => p.id === currentPlayerId)
      if (updated) {
        setMyPlayer(updated)
      }
    }
  }, [])

  // Handle message from guest (host only) - uses refs to avoid stale closures
  const handleGuestMessage = useCallback(
    (message: GuestToHostMessage, conn: DataConnection) => {
      if (!gameEngineRef.current) return

      const engine = gameEngineRef.current
      const opts = optionsRef.current

      switch (message.type) {
        case "JOIN_REQUEST": {
          const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const player = engine.addPlayer(playerId, message.playerName)
          const allPlayers = engine.getAllPlayers()

          conn.metadata = { playerId }
          connectionsRef.current.set(playerId, conn)

          const acceptMsg: HostToGuestMessage = {
            type: "JOIN_ACCEPTED",
            playerId,
            player,
            allPlayers,
          }
          conn.send(acceptMsg)

          const joinMsg: HostToGuestMessage = {
            type: "PLAYER_JOINED",
            player,
            allPlayers,
          }
          connectionsRef.current.forEach((c, id) => {
            if (id !== playerId && c.open) {
              c.send(joinMsg)
            }
          })

          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          opts.onPlayersUpdate?.(allPlayers)
          break
        }

        case "SUBMIT_ANSWER": {
          const result = engine.submitAnswer(
            message.playerId,
            message.questionIndex,
            message.answerIndex
          )
          if (result) {
            const allPlayers = engine.getAllPlayers()
            const resultMsg: HostToGuestMessage = {
              type: "ANSWER_RESULT",
              playerId: message.playerId,
              correct: result.correct,
              newCoins: result.newCoins,
              allPlayers,
            }
            broadcastToGuests(resultMsg)
            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            opts.onPlayersUpdate?.(allPlayers)
          }
          break
        }

        case "NEXT_QUESTION": {
          const result = engine.advanceQuestion(message.playerId, message.wasCorrect)
          if (result) {
            const allPlayers = engine.getAllPlayers()
            
            // Send move result
            const moveMsg: HostToGuestMessage = {
              type: "MOVE_RESULT",
              playerId: message.playerId,
              dieRoll: result.dieRoll,
              skippedDueToJail: result.skippedDueToJail,
              lapBonus: result.lapBonus,
              tileEvent: result.tileEvent,
              allPlayers,
            }
            broadcastToGuests(moveMsg)

            // Send heist prompt if applicable
            if (result.heistPrompt) {
              const heistMsg: HostToGuestMessage = {
                type: "HEIST_PROMPT",
                playerId: message.playerId,
                heistData: result.heistPrompt,
              }
              broadcastToGuests(heistMsg)
            }

            // Send ponzi prompt if applicable
            if (result.ponziPrompt) {
              const ponziMsg: HostToGuestMessage = {
                type: "PONZI_PROMPT",
                playerId: message.playerId,
                ponziData: result.ponziPrompt,
              }
              broadcastToGuests(ponziMsg)
            }

            // Send marriage event if applicable
            if (result.marriageEvent) {
              const marriageMsg: HostToGuestMessage = {
                type: "MARRIAGE_EVENT",
                result: result.marriageEvent,
                allPlayers: engine.getAllPlayers(),
              }
              broadcastToGuests(marriageMsg)
            }

            // Send jail debuff notification if applicable
            if (result.jailApplied) {
              const player = engine.getPlayer(message.playerId)
              if (player) {
                const jailMsg: HostToGuestMessage = {
                  type: "JAIL_DEBUFF_APPLIED",
                  playerName: player.name,
                }
                broadcastToGuests(jailMsg)
              }
            }

            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            opts.onPlayersUpdate?.(allPlayers)
          }
          break
        }

        case "HEIST_TARGET_SELECTED": {
          const result = engine.processHeistTarget(message.playerId, message.targetPlayerId)
          const allPlayers = engine.getAllPlayers()
          
          if (result) {
            const heistResultMsg: HostToGuestMessage = {
              type: "HEIST_RESULT",
              result,
              allPlayers,
            }
            broadcastToGuests(heistResultMsg)

            // Check for marriage after heist
            const marriageResult = engine.checkMarriageAfterInteractive(message.playerId)
            if (marriageResult) {
              const marriageMsg: HostToGuestMessage = {
                type: "MARRIAGE_EVENT",
                result: marriageResult,
                allPlayers: engine.getAllPlayers(),
              }
              broadcastToGuests(marriageMsg)
              opts.onMarriageEvent?.(marriageResult)
            }

            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            opts.onPlayersUpdate?.(allPlayers)
            opts.onHeistResult?.(result)
          } else {
            // Heist failed - send a "failed" result so the modal closes
            console.warn("Heist failed for player:", message.playerId)
            const player = engine.getPlayer(message.playerId)
            const failedResult: HeistResultData = {
              thiefName: player?.name || "Unknown",
              victimName: "Nobody",
              amountStolen: 0,
            }
            const heistResultMsg: HostToGuestMessage = {
              type: "HEIST_RESULT",
              result: failedResult,
              allPlayers,
            }
            // Send directly to the connection that sent this message
            conn.send(heistResultMsg)
            opts.onHeistResult?.(failedResult)
          }
          break
        }

        case "PONZI_CHOICE": {
          const result = engine.processPonziChoice(message.playerId, message.invest)
          const allPlayers = engine.getAllPlayers()
          
          if (result) {
            const ponziResultMsg: HostToGuestMessage = {
              type: "PONZI_RESULT",
              result,
              allPlayers,
            }
            broadcastToGuests(ponziResultMsg)

            // Check for marriage after ponzi
            const marriageResult = engine.checkMarriageAfterInteractive(message.playerId)
            if (marriageResult) {
              const marriageMsg: HostToGuestMessage = {
                type: "MARRIAGE_EVENT",
                result: marriageResult,
                allPlayers: engine.getAllPlayers(),
              }
              broadcastToGuests(marriageMsg)
              opts.onMarriageEvent?.(marriageResult)
            }

            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            opts.onPlayersUpdate?.(allPlayers)
            opts.onPonziResult?.(result)
          } else {
            // Ponzi failed - send a "skipped" result so the modal closes
            console.warn("Ponzi failed for player:", message.playerId)
            const player = engine.getPlayer(message.playerId)
            const failedResult: PonziResultData = {
              playerName: player?.name || "Unknown",
              invested: false,
            }
            const ponziResultMsg: HostToGuestMessage = {
              type: "PONZI_RESULT",
              result: failedResult,
              allPlayers,
            }
            conn.send(ponziResultMsg)
            opts.onPonziResult?.(failedResult)
          }
          break
        }

        case "LEAVE_GAME": {
          engine.removePlayer(message.playerId)
          connectionsRef.current.delete(message.playerId)
          const allPlayers = engine.getAllPlayers()

          const leaveMsg: HostToGuestMessage = {
            type: "PLAYER_LEFT",
            playerId: message.playerId,
            allPlayers,
          }
          broadcastToGuests(leaveMsg)
          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          opts.onPlayersUpdate?.(allPlayers)
          break
        }
      }
    },
    [broadcastToGuests] // Uses refs for options
  )

  // Handle message from host (guest only) - uses refs to avoid stale closures
  const handleHostMessage = useCallback(
    (message: HostToGuestMessage) => {
      const currentPlayerId = myPlayerIdRef.current
      const opts = optionsRef.current
      
      switch (message.type) {
        case "JOIN_ACCEPTED":
          setMyPlayerId(message.playerId)
          myPlayerIdRef.current = message.playerId // Update ref immediately
          setMyPlayer(message.player)
          setRoomState((prev) => ({
            ...prev,
            connectionState: "connected",
            players: message.allPlayers,
          }))
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
          if (message.playerId === myPlayerIdRef.current) {
            opts.onAnswerResult?.({
              playerId: message.playerId,
              correct: message.correct,
              newCoins: message.newCoins,
            })
          }
          updateMyPlayer(message.allPlayers)
          break

        case "MOVE_RESULT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          if (message.playerId === myPlayerIdRef.current) {
            const moveResult: MoveResultForUI = {
              dieRoll: message.dieRoll,
              skippedDueToJail: message.skippedDueToJail,
              lapBonus: message.lapBonus,
              tileEvent: message.tileEvent,
            }
            opts.onMoveResult?.({ playerId: message.playerId, ...moveResult })
            
            // Resolve pending move promise
            if (pendingMoveResolverRef.current) {
              pendingMoveResolverRef.current(moveResult)
              pendingMoveResolverRef.current = null
            }
          }
          updateMyPlayer(message.allPlayers)
          break

        case "HEIST_PROMPT":
          if (message.playerId === myPlayerIdRef.current) {
            opts.onHeistPrompt?.(message.heistData)
          }
          break

        case "HEIST_RESULT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          opts.onHeistResult?.(message.result)
          updateMyPlayer(message.allPlayers)
          break

        case "PONZI_PROMPT":
          if (message.playerId === myPlayerIdRef.current) {
            opts.onPonziPrompt?.(message.ponziData)
          }
          break

        case "PONZI_RESULT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          opts.onPonziResult?.(message.result)
          updateMyPlayer(message.allPlayers)
          break

        case "MARRIAGE_EVENT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          opts.onMarriageEvent?.(message.result)
          updateMyPlayer(message.allPlayers)
          break

        case "JAIL_DEBUFF_APPLIED":
          opts.onJailApplied?.(message.playerName)
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
    [updateMyPlayer] // Only depends on updateMyPlayer, uses refs for the rest
  )

  // Create a new room (become host)
  const createRoom = useCallback(
    (hostName: string) => {
      const roomCode = generateRoomCode()
      const peerId = roomCodeToPeerId(roomCode)

      setRoomState((prev) => ({
        ...prev,
        roomCode,
        role: "host",
        connectionState: "connecting",
        hostName,
      }))

      gameEngineRef.current = new P2PGameEngine()

      const peer = new Peer(peerId)
      peerRef.current = peer

      peer.on("open", (id) => {
        console.log("Host peer opened with ID:", id)

        const hostPlayerId = `host-${Date.now()}`
        const hostPlayer = gameEngineRef.current!.addPlayer(hostPlayerId, hostName)
        setMyPlayerId(hostPlayerId)
        myPlayerIdRef.current = hostPlayerId // Update ref immediately
        setMyPlayer(hostPlayer)

        const allPlayers = gameEngineRef.current!.getAllPlayers()
        setRoomState((prev) => ({
          ...prev,
          connectionState: "connected",
          players: allPlayers,
        }))
        optionsRef.current.onPlayersUpdate?.(allPlayers)
      })

      peer.on("connection", (conn) => {
        console.log("Guest connected:", conn.peer)

        conn.on("open", () => {
          console.log("Connection opened with guest")
        })

        conn.on("data", (data) => {
          handleGuestMessage(data as GuestToHostMessage, conn)
        })

        conn.on("close", () => {
          const playerId = conn.metadata?.playerId
          if (playerId && gameEngineRef.current) {
            gameEngineRef.current.removePlayer(playerId)
            connectionsRef.current.delete(playerId)
            const allPlayers = gameEngineRef.current.getAllPlayers()

            const leaveMsg: HostToGuestMessage = {
              type: "PLAYER_LEFT",
              playerId,
              allPlayers,
            }
            broadcastToGuests(leaveMsg)
            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            optionsRef.current.onPlayersUpdate?.(allPlayers)
          }
        })
      })

      peer.on("error", (err) => {
        console.error("Peer error:", err)
        optionsRef.current.onError?.(err.message)
        setRoomState((prev) => ({ ...prev, connectionState: "error" }))
      })
    },
    [broadcastToGuests, handleGuestMessage]
  )

  // Join an existing room
  const joinRoom = useCallback(
    (roomCode: string, playerName: string) => {
      const peerId = roomCodeToPeerId(roomCode)

      setRoomState((prev) => ({
        ...prev,
        roomCode: roomCode.toUpperCase(),
        role: "guest",
        connectionState: "connecting",
      }))

      const peer = new Peer()
      peerRef.current = peer

      peer.on("open", () => {
        console.log("Guest peer opened, connecting to host:", peerId)

        const conn = peer.connect(peerId, { reliable: true })
        hostConnectionRef.current = conn

        conn.on("open", () => {
          console.log("Connected to host")
          const joinMsg: GuestToHostMessage = {
            type: "JOIN_REQUEST",
            playerName,
          }
          conn.send(joinMsg)
        })

        conn.on("data", (data) => {
          handleHostMessage(data as HostToGuestMessage)
        })

        conn.on("close", () => {
          console.log("Connection to host closed")
          optionsRef.current.onHostDisconnected?.()
          setRoomState((prev) => ({ ...prev, connectionState: "disconnected" }))
        })

        conn.on("error", (err) => {
          console.error("Connection error:", err)
          optionsRef.current.onError?.("Failed to connect to room")
          setRoomState((prev) => ({ ...prev, connectionState: "error" }))
        })
      })

      peer.on("error", (err) => {
        console.error("Peer error:", err)
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

  // Start the game (host only)
  const startGame = useCallback(() => {
    if (roomState.role !== "host" || !gameEngineRef.current) return

    const allPlayers = gameEngineRef.current.startGame()

    const startMsg: HostToGuestMessage = {
      type: "GAME_STARTED",
      allPlayers,
    }
    broadcastToGuests(startMsg)

    setRoomState((prev) => ({ ...prev, gameStarted: true, players: allPlayers }))
    options.onPlayersUpdate?.(allPlayers)
    options.onGameStarted?.()
  }, [broadcastToGuests, options, roomState.role])

  // Submit an answer
  const submitAnswer = useCallback(
    (questionIndex: number, answerIndex: number) => {
      if (!myPlayerId) return

      if (roomState.role === "host" && gameEngineRef.current) {
        const result = gameEngineRef.current.submitAnswer(myPlayerId, questionIndex, answerIndex)
        if (result) {
          const allPlayers = gameEngineRef.current.getAllPlayers()

          const resultMsg: HostToGuestMessage = {
            type: "ANSWER_RESULT",
            playerId: myPlayerId,
            correct: result.correct,
            newCoins: result.newCoins,
            allPlayers,
          }
          broadcastToGuests(resultMsg)

          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          options.onPlayersUpdate?.(allPlayers)
          options.onAnswerResult?.({
            playerId: myPlayerId,
            correct: result.correct,
            newCoins: result.newCoins,
          })

          const updatedPlayer = allPlayers.find((p) => p.id === myPlayerId)
          if (updatedPlayer) {
            setMyPlayer(updatedPlayer)
          }
        }
      } else {
        const msg: GuestToHostMessage = {
          type: "SUBMIT_ANSWER",
          playerId: myPlayerId,
          questionIndex,
          answerIndex,
        }
        sendToHost(msg)
      }
    },
    [broadcastToGuests, myPlayerId, options, roomState.role, sendToHost]
  )

  // Advance to next question - returns a Promise with the result
  const advanceQuestion = useCallback(
    (wasCorrect: boolean): Promise<MoveResultForUI> => {
      return new Promise((resolve) => {
        if (!myPlayerId) {
          resolve({ dieRoll: null, skippedDueToJail: false, lapBonus: null, tileEvent: null })
          return
        }

        if (roomState.role === "host" && gameEngineRef.current) {
          const result = gameEngineRef.current.advanceQuestion(myPlayerId, wasCorrect)
          if (result) {
            const allPlayers = gameEngineRef.current.getAllPlayers()

            // Broadcast move result
            const moveMsg: HostToGuestMessage = {
              type: "MOVE_RESULT",
              playerId: myPlayerId,
              dieRoll: result.dieRoll,
              skippedDueToJail: result.skippedDueToJail,
              lapBonus: result.lapBonus,
              tileEvent: result.tileEvent,
              allPlayers,
            }
            broadcastToGuests(moveMsg)

            // Handle interactive prompts for host
            if (result.heistPrompt) {
              options.onHeistPrompt?.(result.heistPrompt)
            }
            if (result.ponziPrompt) {
              options.onPonziPrompt?.(result.ponziPrompt)
            }
            if (result.marriageEvent) {
              const marriageMsg: HostToGuestMessage = {
                type: "MARRIAGE_EVENT",
                result: result.marriageEvent,
                allPlayers: gameEngineRef.current.getAllPlayers(),
              }
              broadcastToGuests(marriageMsg)
              options.onMarriageEvent?.(result.marriageEvent)
            }
            if (result.jailApplied) {
              const player = gameEngineRef.current.getPlayer(myPlayerId)
              if (player) {
                const jailMsg: HostToGuestMessage = {
                  type: "JAIL_DEBUFF_APPLIED",
                  playerName: player.name,
                }
                broadcastToGuests(jailMsg)
                options.onJailApplied?.(player.name)
              }
            }

            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            options.onPlayersUpdate?.(allPlayers)
            options.onMoveResult?.({ playerId: myPlayerId, ...result })

            const updatedPlayer = allPlayers.find((p) => p.id === myPlayerId)
            if (updatedPlayer) {
              setMyPlayer(updatedPlayer)
            }

            resolve(result)
          } else {
            resolve({ dieRoll: null, skippedDueToJail: false, lapBonus: null, tileEvent: null })
          }
        } else {
          pendingMoveResolverRef.current = resolve

          const msg: GuestToHostMessage = {
            type: "NEXT_QUESTION",
            playerId: myPlayerId,
            wasCorrect,
          }
          sendToHost(msg)

          setTimeout(() => {
            if (pendingMoveResolverRef.current === resolve) {
              pendingMoveResolverRef.current = null
              resolve({ dieRoll: null, skippedDueToJail: false, lapBonus: null, tileEvent: null })
            }
          }, 10000)
        }
      })
    },
    [broadcastToGuests, myPlayerId, options, roomState.role, sendToHost]
  )

  // Select heist target
  const selectHeistTarget = useCallback(
    (targetPlayerId: string) => {
      if (!myPlayerId) return

      if (roomState.role === "host" && gameEngineRef.current) {
        const result = gameEngineRef.current.processHeistTarget(myPlayerId, targetPlayerId)
        if (result) {
          const allPlayers = gameEngineRef.current.getAllPlayers()
          const heistResultMsg: HostToGuestMessage = {
            type: "HEIST_RESULT",
            result,
            allPlayers,
          }
          broadcastToGuests(heistResultMsg)

          // Check for marriage after heist
          const marriageResult = gameEngineRef.current.checkMarriageAfterInteractive(myPlayerId)
          if (marriageResult) {
            const marriageMsg: HostToGuestMessage = {
              type: "MARRIAGE_EVENT",
              result: marriageResult,
              allPlayers: gameEngineRef.current.getAllPlayers(),
            }
            broadcastToGuests(marriageMsg)
            options.onMarriageEvent?.(marriageResult)
          }

          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          options.onPlayersUpdate?.(allPlayers)
          options.onHeistResult?.(result)

          const updatedPlayer = allPlayers.find((p) => p.id === myPlayerId)
          if (updatedPlayer) {
            setMyPlayer(updatedPlayer)
          }
        }
      } else {
        const msg: GuestToHostMessage = {
          type: "HEIST_TARGET_SELECTED",
          playerId: myPlayerId,
          targetPlayerId,
        }
        sendToHost(msg)
      }
    },
    [broadcastToGuests, myPlayerId, options, roomState.role, sendToHost]
  )

  // Make ponzi choice
  const makePonziChoice = useCallback(
    (invest: boolean) => {
      if (!myPlayerId) return

      if (roomState.role === "host" && gameEngineRef.current) {
        const result = gameEngineRef.current.processPonziChoice(myPlayerId, invest)
        if (result) {
          const allPlayers = gameEngineRef.current.getAllPlayers()
          const ponziResultMsg: HostToGuestMessage = {
            type: "PONZI_RESULT",
            result,
            allPlayers,
          }
          broadcastToGuests(ponziResultMsg)

          // Check for marriage after ponzi
          const marriageResult = gameEngineRef.current.checkMarriageAfterInteractive(myPlayerId)
          if (marriageResult) {
            const marriageMsg: HostToGuestMessage = {
              type: "MARRIAGE_EVENT",
              result: marriageResult,
              allPlayers: gameEngineRef.current.getAllPlayers(),
            }
            broadcastToGuests(marriageMsg)
            options.onMarriageEvent?.(marriageResult)
          }

          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          options.onPlayersUpdate?.(allPlayers)
          options.onPonziResult?.(result)

          const updatedPlayer = allPlayers.find((p) => p.id === myPlayerId)
          if (updatedPlayer) {
            setMyPlayer(updatedPlayer)
          }
        }
      } else {
        const msg: GuestToHostMessage = {
          type: "PONZI_CHOICE",
          playerId: myPlayerId,
          invest,
        }
        sendToHost(msg)
      }
    },
    [broadcastToGuests, myPlayerId, options, roomState.role, sendToHost]
  )

  // Reset game (host only)
  const resetGame = useCallback(() => {
    if (roomState.role !== "host" || !gameEngineRef.current) return

    gameEngineRef.current.reset()

    const resetMsg: HostToGuestMessage = {
      type: "GAME_RESET",
    }
    broadcastToGuests(resetMsg)

    setRoomState((prev) => ({
      ...prev,
      players: [],
      gameStarted: false,
    }))
    options.onGameReset?.()
  }, [broadcastToGuests, options, roomState.role])

  // Leave the game
  const leaveGame = useCallback(() => {
    if (roomState.role === "guest" && myPlayerId) {
      const msg: GuestToHostMessage = {
        type: "LEAVE_GAME",
        playerId: myPlayerId,
      }
      sendToHost(msg)
    }

    peerRef.current?.destroy()
    peerRef.current = null
    hostConnectionRef.current = null
    connectionsRef.current.clear()
    gameEngineRef.current = null

    setRoomState({
      roomCode: "",
      role: "guest",
      connectionState: "disconnected",
      players: [],
      gameStarted: false,
    })
    setMyPlayerId(null)
    setMyPlayer(null)
  }, [myPlayerId, roomState.role, sendToHost])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerRef.current?.destroy()
    }
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
    resetGame,
    leaveGame,
  }
}
