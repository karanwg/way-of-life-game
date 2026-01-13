"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Peer, { DataConnection } from "peerjs"
import type { Player } from "@/lib/types"
import type {
  RoomState,
  ConnectionState,
  GuestToHostMessage,
  HostToGuestMessage,
} from "@/lib/p2p-types"
import { P2PGameEngine } from "@/lib/p2p-game-engine"

// Generate a short room code from peer ID
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed confusing chars (0, O, 1, I)
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

// Extract room code from peer ID
function peerIdToRoomCode(peerId: string): string {
  return peerId.replace("wayoflife-", "")
}

interface UsePeerGameOptions {
  onPlayersUpdate?: (players: Player[]) => void
  onGameStarted?: () => void
  onAnswerResult?: (result: { playerId: string; correct: boolean; newCoins: number }) => void
  onMoveResult?: (result: {
    playerId: string
    dieRoll: number | null
    tileEvent: { tileName: string; tileText: string; coinsDelta: number; isGlobal: boolean } | null
    lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
  }) => void
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
  const pendingMoveResolverRef = useRef<((result: {
    dieRoll: number | null
    tileEvent: { tileName: string; tileText: string; coinsDelta: number; isGlobal: boolean } | null
    lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
  }) => void) | null>(null)

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
    }
  }, [])

  // Handle message from guest (host only)
  const handleGuestMessage = useCallback(
    (message: GuestToHostMessage, conn: DataConnection) => {
      if (!gameEngineRef.current) return

      const engine = gameEngineRef.current

      switch (message.type) {
        case "JOIN_REQUEST": {
          const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const player = engine.addPlayer(playerId, message.playerName)
          const allPlayers = engine.getAllPlayers()

          // Store connection with player ID
          conn.metadata = { playerId }
          connectionsRef.current.set(playerId, conn)

          // Send acceptance to the joining player
          const acceptMsg: HostToGuestMessage = {
            type: "JOIN_ACCEPTED",
            playerId,
            player,
            allPlayers,
          }
          conn.send(acceptMsg)

          // Broadcast to all other guests
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

          // Update local state
          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          options.onPlayersUpdate?.(allPlayers)
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
            options.onPlayersUpdate?.(allPlayers)

            // If this is the host's own answer
            if (message.playerId === myPlayerId) {
              options.onAnswerResult?.({
                playerId: message.playerId,
                correct: result.correct,
                newCoins: result.newCoins,
              })
            }
          }
          break
        }

        case "NEXT_QUESTION": {
          const result = engine.advanceQuestion(message.playerId, message.wasCorrect)
          if (result) {
            const allPlayers = engine.getAllPlayers()
            const moveMsg: HostToGuestMessage = {
              type: "MOVE_RESULT",
              playerId: message.playerId,
              dieRoll: result.dieRoll,
              tileEvent: result.tileEvent,
              lapBonus: result.lapBonus,
              allPlayers,
            }
            broadcastToGuests(moveMsg)
            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            options.onPlayersUpdate?.(allPlayers)

            // If this is the host's own move
            if (message.playerId === myPlayerId) {
              options.onMoveResult?.({
                playerId: message.playerId,
                ...result,
              })
            }
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
          options.onPlayersUpdate?.(allPlayers)
          break
        }
      }
    },
    [broadcastToGuests, myPlayerId, options]
  )

  // Handle message from host (guest only)
  const handleHostMessage = useCallback(
    (message: HostToGuestMessage) => {
      switch (message.type) {
        case "JOIN_ACCEPTED":
          setMyPlayerId(message.playerId)
          setMyPlayer(message.player)
          setRoomState((prev) => ({
            ...prev,
            connectionState: "connected",
            players: message.allPlayers,
          }))
          options.onPlayersUpdate?.(message.allPlayers)
          break

        case "JOIN_REJECTED":
          options.onError?.(message.reason)
          setRoomState((prev) => ({ ...prev, connectionState: "error" }))
          break

        case "PLAYER_JOINED":
        case "PLAYER_LEFT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          options.onPlayersUpdate?.(message.allPlayers)
          break

        case "GAME_STARTED":
          setRoomState((prev) => ({ ...prev, gameStarted: true, players: message.allPlayers }))
          options.onPlayersUpdate?.(message.allPlayers)
          options.onGameStarted?.()
          break

        case "STATE_UPDATE":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          options.onPlayersUpdate?.(message.allPlayers)
          break

        case "ANSWER_RESULT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          options.onPlayersUpdate?.(message.allPlayers)
          if (message.playerId === myPlayerId) {
            options.onAnswerResult?.({
              playerId: message.playerId,
              correct: message.correct,
              newCoins: message.newCoins,
            })
          }
          // Update my player state
          const updatedPlayer = message.allPlayers.find((p) => p.id === myPlayerId)
          if (updatedPlayer) {
            setMyPlayer(updatedPlayer)
          }
          break

        case "MOVE_RESULT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          options.onPlayersUpdate?.(message.allPlayers)
          if (message.playerId === myPlayerId) {
            options.onMoveResult?.({
              playerId: message.playerId,
              dieRoll: message.dieRoll,
              tileEvent: message.tileEvent,
              lapBonus: message.lapBonus,
            })
            // Resolve pending move promise for this player
            if (pendingMoveResolverRef.current) {
              pendingMoveResolverRef.current({
                dieRoll: message.dieRoll,
                tileEvent: message.tileEvent,
                lapBonus: message.lapBonus,
              })
              pendingMoveResolverRef.current = null
            }
          }
          // Update my player state
          const movedPlayer = message.allPlayers.find((p) => p.id === myPlayerId)
          if (movedPlayer) {
            setMyPlayer(movedPlayer)
          }
          break

        case "GAME_RESET":
          options.onGameReset?.()
          break

        case "HOST_DISCONNECTED":
          options.onHostDisconnected?.()
          setRoomState((prev) => ({ ...prev, connectionState: "error" }))
          break
      }
    },
    [myPlayerId, options]
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

      // Initialize game engine
      gameEngineRef.current = new P2PGameEngine()

      // Create peer with specific ID
      const peer = new Peer(peerId)
      peerRef.current = peer

      peer.on("open", (id) => {
        console.log("Host peer opened with ID:", id)

        // Add host as first player
        const hostPlayerId = `host-${Date.now()}`
        const hostPlayer = gameEngineRef.current!.addPlayer(hostPlayerId, hostName)
        setMyPlayerId(hostPlayerId)
        setMyPlayer(hostPlayer)

        const allPlayers = gameEngineRef.current!.getAllPlayers()
        setRoomState((prev) => ({
          ...prev,
          connectionState: "connected",
          players: allPlayers,
        }))
        options.onPlayersUpdate?.(allPlayers)
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
          // Find and remove the player associated with this connection
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
            options.onPlayersUpdate?.(allPlayers)
          }
        })
      })

      peer.on("error", (err) => {
        console.error("Peer error:", err)
        options.onError?.(err.message)
        setRoomState((prev) => ({ ...prev, connectionState: "error" }))
      })
    },
    [broadcastToGuests, handleGuestMessage, options]
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
          // Send join request
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
          options.onHostDisconnected?.()
          setRoomState((prev) => ({ ...prev, connectionState: "disconnected" }))
        })

        conn.on("error", (err) => {
          console.error("Connection error:", err)
          options.onError?.("Failed to connect to room")
          setRoomState((prev) => ({ ...prev, connectionState: "error" }))
        })
      })

      peer.on("error", (err) => {
        console.error("Peer error:", err)
        if (err.type === "peer-unavailable") {
          options.onError?.("Room not found. Check the code and try again.")
        } else {
          options.onError?.(err.message)
        }
        setRoomState((prev) => ({ ...prev, connectionState: "error" }))
      })
    },
    [handleHostMessage, options]
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
        // Host processes directly
        const result = gameEngineRef.current.submitAnswer(myPlayerId, questionIndex, answerIndex)
        if (result) {
          const allPlayers = gameEngineRef.current.getAllPlayers()

          // Broadcast to guests
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

          // Update my player
          const updatedPlayer = allPlayers.find((p) => p.id === myPlayerId)
          if (updatedPlayer) {
            setMyPlayer(updatedPlayer)
          }
        }
      } else {
        // Guest sends to host
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
    (wasCorrect: boolean): Promise<{
      dieRoll: number | null
      tileEvent: { tileName: string; tileText: string; coinsDelta: number; isGlobal: boolean } | null
      lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
    }> => {
      return new Promise((resolve) => {
        if (!myPlayerId) {
          resolve({ dieRoll: null, tileEvent: null, lapBonus: null })
          return
        }

        if (roomState.role === "host" && gameEngineRef.current) {
          // Host processes directly and resolves immediately
          const result = gameEngineRef.current.advanceQuestion(myPlayerId, wasCorrect)
          if (result) {
            const allPlayers = gameEngineRef.current.getAllPlayers()

            // Broadcast to guests
            const moveMsg: HostToGuestMessage = {
              type: "MOVE_RESULT",
              playerId: myPlayerId,
              dieRoll: result.dieRoll,
              tileEvent: result.tileEvent,
              lapBonus: result.lapBonus,
              allPlayers,
            }
            broadcastToGuests(moveMsg)

            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            options.onPlayersUpdate?.(allPlayers)
            options.onMoveResult?.({
              playerId: myPlayerId,
              ...result,
            })

            // Update my player
            const updatedPlayer = allPlayers.find((p) => p.id === myPlayerId)
            if (updatedPlayer) {
              setMyPlayer(updatedPlayer)
            }

            // Resolve immediately for host
            resolve(result)
          } else {
            resolve({ dieRoll: null, tileEvent: null, lapBonus: null })
          }
        } else {
          // Guest: store resolver and send to host
          pendingMoveResolverRef.current = resolve
          
          const msg: GuestToHostMessage = {
            type: "NEXT_QUESTION",
            playerId: myPlayerId,
            wasCorrect,
          }
          sendToHost(msg)
          
          // Timeout after 5 seconds
          setTimeout(() => {
            if (pendingMoveResolverRef.current === resolve) {
              pendingMoveResolverRef.current = null
              resolve({ dieRoll: null, tileEvent: null, lapBonus: null })
            }
          }, 5000)
        }
      })
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

    // Clean up
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
    resetGame,
    leaveGame,
  }
}
