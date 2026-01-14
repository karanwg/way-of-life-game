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
  PolicePromptData,
  PoliceResultData,
  IdentityTheftResultData,
} from "@/lib/p2p-types"
import { P2PGameEngine, type MoveResult } from "@/lib/p2p-game-engine"

// Generate a short room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function roomCodeToPeerId(code: string): string {
  return `wayoflife-${code.toUpperCase()}`
}

export interface MoveResultForUI {
  dieRoll: number | null
  dieRolls?: number[] // Individual rolls for "roll again on 6"
  lapBonus: { lapsCompleted: number; coinsAwarded: number } | null
  tileEvent: TileEventData | null
  heistPrompt?: HeistPromptData
  ponziPrompt?: PonziPromptData
  policePrompt?: PolicePromptData
  identityTheftEvent?: IdentityTheftResultData
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
  onPolicePrompt?: (data: PolicePromptData) => void
  onPoliceResult?: (result: PoliceResultData) => void
  onIdentityTheftEvent?: (result: IdentityTheftResultData) => void
  onImpactedByEvent?: (event: { tileName: string; tileText: string; coinsDelta: number; isBigEvent: boolean; triggeredByName: string }) => void
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
  const pendingMoveResolverRef = useRef<((result: MoveResultForUI) => void) | null>(null)
  
  // Refs to avoid stale closures in event handlers
  const myPlayerIdRef = useRef<string | null>(null)
  const optionsRef = useRef(options)
  
  useEffect(() => {
    myPlayerIdRef.current = myPlayerId
  }, [myPlayerId])
  
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const broadcastToGuests = useCallback((message: HostToGuestMessage) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(message)
      }
    })
  }, [])

  const sendToHost = useCallback((message: GuestToHostMessage) => {
    if (hostConnectionRef.current?.open) {
      hostConnectionRef.current.send(message)
    } else {
      console.error("Cannot send to host - connection not open", message.type)
    }
  }, [])

  const updateMyPlayer = useCallback((allPlayers: Player[]) => {
    const currentPlayerId = myPlayerIdRef.current
    if (currentPlayerId) {
      const updated = allPlayers.find((p) => p.id === currentPlayerId)
      if (updated) {
        setMyPlayer(updated)
      }
    }
  }, [])

  // Handle message from guest (host only)
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

          ;(conn as any).metadata = { playerId }
          connectionsRef.current.set(playerId, conn)

          conn.send({ type: "JOIN_ACCEPTED", playerId, player, allPlayers })
          
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
            broadcastToGuests({ type: "ANSWER_RESULT", playerId: message.playerId, correct: result.correct, newCoins: result.newCoins, allPlayers })
            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            opts.onPlayersUpdate?.(allPlayers)
          }
          break
        }

        case "NEXT_QUESTION": {
          const result = engine.advanceQuestion(message.playerId, message.wasCorrect)
          if (result) {
            const allPlayers = engine.getAllPlayers()
            
            // Don't include tileEvent if there's an interactive prompt (to avoid double modals)
            const hasInteractivePrompt = result.heistPrompt || result.ponziPrompt || result.policePrompt
            
            broadcastToGuests({
              type: "MOVE_RESULT",
              playerId: message.playerId,
              dieRoll: result.dieRoll,
              dieRolls: result.dieRolls,
              lapBonus: result.lapBonus,
              tileEvent: hasInteractivePrompt ? null : result.tileEvent,
              allPlayers,
            })

            if (result.heistPrompt) {
              broadcastToGuests({ type: "HEIST_PROMPT", playerId: message.playerId, heistData: result.heistPrompt })
            }
            if (result.ponziPrompt) {
              broadcastToGuests({ type: "PONZI_PROMPT", playerId: message.playerId, ponziData: result.ponziPrompt })
            }
            if (result.policePrompt) {
              broadcastToGuests({ type: "POLICE_PROMPT", playerId: message.playerId, policeData: result.policePrompt })
            }
            if (result.identityTheftEvent) {
              broadcastToGuests({ type: "IDENTITY_THEFT_EVENT", result: result.identityTheftEvent, allPlayers: engine.getAllPlayers() })
            }

            // If this is a GUEST's move with a global event, check if HOST is impacted
            if (message.playerId !== myPlayerIdRef.current && result.tileEvent?.isGlobal && result.tileEvent.impactedPlayers && !hasInteractivePrompt) {
              const myImpact = result.tileEvent.impactedPlayers.find(p => p.id === myPlayerIdRef.current)
              if (myImpact) {
                const triggerPlayer = allPlayers.find(p => p.id === message.playerId)
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
          }
          break
        }

        case "HEIST_TARGET_SELECTED": {
          const result = engine.processHeistTarget(message.playerId, message.targetPlayerId)
          const allPlayers = engine.getAllPlayers()
          
          if (result) {
            broadcastToGuests({ type: "HEIST_RESULT", result, allPlayers })

            const identityTheftResult = engine.checkIdentityTheftAfterInteractive(message.playerId)
            if (identityTheftResult) {
              broadcastToGuests({ type: "IDENTITY_THEFT_EVENT", result: identityTheftResult, allPlayers: engine.getAllPlayers() })
              opts.onIdentityTheftEvent?.(identityTheftResult)
            }

            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            opts.onPlayersUpdate?.(allPlayers)
            opts.onHeistResult?.(result)
          } else {
            const player = engine.getPlayer(message.playerId)
            conn.send({ type: "HEIST_RESULT", result: { thiefName: player?.name || "Unknown", victimName: "Nobody", amountStolen: 0 }, allPlayers })
          }
          break
        }

        case "PONZI_CHOICE": {
          const result = engine.processPonziChoice(message.playerId, message.invest)
          const allPlayers = engine.getAllPlayers()
          
          if (result) {
            broadcastToGuests({ type: "PONZI_RESULT", result, allPlayers })

            const identityTheftResult = engine.checkIdentityTheftAfterInteractive(message.playerId)
            if (identityTheftResult) {
              broadcastToGuests({ type: "IDENTITY_THEFT_EVENT", result: identityTheftResult, allPlayers: engine.getAllPlayers() })
              opts.onIdentityTheftEvent?.(identityTheftResult)
            }

            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            opts.onPlayersUpdate?.(allPlayers)
            opts.onPonziResult?.(result)
          } else {
            const player = engine.getPlayer(message.playerId)
            conn.send({ type: "PONZI_RESULT", result: { playerName: player?.name || "Unknown", invested: false }, allPlayers })
          }
          break
        }

        case "POLICE_TARGET_SELECTED": {
          const result = engine.processPoliceTarget(message.playerId, message.targetPlayerId)
          const allPlayers = engine.getAllPlayers()
          
          if (result) {
            broadcastToGuests({ type: "POLICE_RESULT", result, allPlayers })

            const identityTheftResult = engine.checkIdentityTheftAfterInteractive(message.playerId)
            if (identityTheftResult) {
              broadcastToGuests({ type: "IDENTITY_THEFT_EVENT", result: identityTheftResult, allPlayers: engine.getAllPlayers() })
              opts.onIdentityTheftEvent?.(identityTheftResult)
            }

            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            opts.onPlayersUpdate?.(allPlayers)
            opts.onPoliceResult?.(result)
          } else {
            const player = engine.getPlayer(message.playerId)
            conn.send({ type: "POLICE_RESULT", result: { snitchName: player?.name || "Unknown", victimName: "Nobody", coinsLost: 0 }, allPlayers })
          }
          break
        }

        case "LEAVE_GAME": {
          engine.removePlayer(message.playerId)
          connectionsRef.current.delete(message.playerId)
          const allPlayers = engine.getAllPlayers()
          broadcastToGuests({ type: "PLAYER_LEFT", playerId: message.playerId, allPlayers })
          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          opts.onPlayersUpdate?.(allPlayers)
          break
        }
      }
    },
    [broadcastToGuests]
  )

  // Handle message from host (guest only)
  const handleHostMessage = useCallback(
    (message: HostToGuestMessage) => {
      const opts = optionsRef.current
      
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
          if (message.playerId === myPlayerIdRef.current) {
            opts.onAnswerResult?.({ playerId: message.playerId, correct: message.correct, newCoins: message.newCoins })
          }
          updateMyPlayer(message.allPlayers)
          break

        case "MOVE_RESULT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          if (message.playerId === myPlayerIdRef.current) {
            // This is MY move result
            const moveResult: MoveResultForUI = {
              dieRoll: message.dieRoll,
              dieRolls: message.dieRolls,
              lapBonus: message.lapBonus,
              tileEvent: message.tileEvent,
            }
            opts.onMoveResult?.({ playerId: message.playerId, ...moveResult })
            if (pendingMoveResolverRef.current) {
              pendingMoveResolverRef.current(moveResult)
              pendingMoveResolverRef.current = null
            }
          } else if (message.tileEvent?.isGlobal && message.tileEvent.impactedPlayers) {
            // Check if current player is impacted by this event
            const myImpact = message.tileEvent.impactedPlayers.find(p => p.id === myPlayerIdRef.current)
            if (myImpact) {
              const triggerPlayer = message.allPlayers.find(p => p.id === message.playerId)
              opts.onImpactedByEvent?.({
                tileName: message.tileEvent.tileName,
                tileText: message.tileEvent.tileText,
                coinsDelta: myImpact.coinsDelta,
                isBigEvent: myImpact.isBigEvent || false,
                triggeredByName: triggerPlayer?.name || "Someone",
              })
            }
            // Non-impacted players see nothing
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

        case "POLICE_PROMPT":
          if (message.playerId === myPlayerIdRef.current) {
            opts.onPolicePrompt?.(message.policeData)
          }
          break

        case "POLICE_RESULT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          opts.onPoliceResult?.(message.result)
          updateMyPlayer(message.allPlayers)
          break

        case "IDENTITY_THEFT_EVENT":
          setRoomState((prev) => ({ ...prev, players: message.allPlayers }))
          opts.onPlayersUpdate?.(message.allPlayers)
          opts.onIdentityTheftEvent?.(message.result)
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

  const createRoom = useCallback(
    (hostName: string) => {
      const roomCode = generateRoomCode()
      const peerId = roomCodeToPeerId(roomCode)

      setRoomState((prev) => ({ ...prev, roomCode, role: "host", connectionState: "connecting", hostName }))

      gameEngineRef.current = new P2PGameEngine()

      const peer = new Peer(peerId)
      peerRef.current = peer

      peer.on("open", () => {
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
          const playerId = conn.metadata?.playerId
          if (playerId && gameEngineRef.current) {
            gameEngineRef.current.removePlayer(playerId)
            connectionsRef.current.delete(playerId)
            const allPlayers = gameEngineRef.current.getAllPlayers()
            broadcastToGuests({ type: "PLAYER_LEFT", playerId, allPlayers })
            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            optionsRef.current.onPlayersUpdate?.(allPlayers)
          }
        })
      })

      peer.on("error", (err) => {
        optionsRef.current.onError?.(err.message)
        setRoomState((prev) => ({ ...prev, connectionState: "error" }))
      })
    },
    [broadcastToGuests, handleGuestMessage]
  )

  const joinRoom = useCallback(
    (roomCode: string, playerName: string) => {
      const peerId = roomCodeToPeerId(roomCode)
      setRoomState((prev) => ({ ...prev, roomCode: roomCode.toUpperCase(), role: "guest", connectionState: "connecting" }))

      const peer = new Peer()
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

  const startGame = useCallback(() => {
    if (roomState.role !== "host" || !gameEngineRef.current) return
    const allPlayers = gameEngineRef.current.startGame()
    broadcastToGuests({ type: "GAME_STARTED", allPlayers })
    setRoomState((prev) => ({ ...prev, gameStarted: true, players: allPlayers }))
    options.onPlayersUpdate?.(allPlayers)
    options.onGameStarted?.()
  }, [broadcastToGuests, options, roomState.role])

  const submitAnswer = useCallback(
    (questionIndex: number, answerIndex: number) => {
      if (!myPlayerId) return

      if (roomState.role === "host" && gameEngineRef.current) {
        const result = gameEngineRef.current.submitAnswer(myPlayerId, questionIndex, answerIndex)
        if (result) {
          const allPlayers = gameEngineRef.current.getAllPlayers()
          broadcastToGuests({ type: "ANSWER_RESULT", playerId: myPlayerId, correct: result.correct, newCoins: result.newCoins, allPlayers })
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

  const advanceQuestion = useCallback(
    (wasCorrect: boolean): Promise<MoveResultForUI> => {
      return new Promise((resolve) => {
        if (!myPlayerId) {
          resolve({ dieRoll: null, lapBonus: null, tileEvent: null })
          return
        }

        if (roomState.role === "host" && gameEngineRef.current) {
          const result = gameEngineRef.current.advanceQuestion(myPlayerId, wasCorrect)
          if (result) {
            const allPlayers = gameEngineRef.current.getAllPlayers()
            // Don't include tileEvent if there's an interactive prompt (to avoid double modals)
            const hasInteractivePrompt = result.heistPrompt || result.ponziPrompt || result.policePrompt
            broadcastToGuests({ type: "MOVE_RESULT", playerId: myPlayerId, dieRoll: result.dieRoll, dieRolls: result.dieRolls, lapBonus: result.lapBonus, tileEvent: hasInteractivePrompt ? null : result.tileEvent, allPlayers })

            if (result.heistPrompt) options.onHeistPrompt?.(result.heistPrompt)
            if (result.ponziPrompt) options.onPonziPrompt?.(result.ponziPrompt)
            if (result.policePrompt) options.onPolicePrompt?.(result.policePrompt)
            if (result.identityTheftEvent) {
              broadcastToGuests({ type: "IDENTITY_THEFT_EVENT", result: result.identityTheftEvent, allPlayers: gameEngineRef.current.getAllPlayers() })
              options.onIdentityTheftEvent?.(result.identityTheftEvent)
            }

            setRoomState((prev) => ({ ...prev, players: allPlayers }))
            options.onPlayersUpdate?.(allPlayers)
            
            // Exclude tileEvent from the result if there's an interactive prompt
            const resultForUI = hasInteractivePrompt 
              ? { ...result, tileEvent: null }
              : result
            options.onMoveResult?.({ playerId: myPlayerId, ...resultForUI })
            updateMyPlayer(allPlayers)
            resolve(resultForUI)
          } else {
            resolve({ dieRoll: null, lapBonus: null, tileEvent: null })
          }
        } else {
          pendingMoveResolverRef.current = resolve
          sendToHost({ type: "NEXT_QUESTION", playerId: myPlayerId, wasCorrect })
          setTimeout(() => {
            if (pendingMoveResolverRef.current === resolve) {
              pendingMoveResolverRef.current = null
              resolve({ dieRoll: null, lapBonus: null, tileEvent: null })
            }
          }, 10000)
        }
      })
    },
    [broadcastToGuests, myPlayerId, options, roomState.role, sendToHost, updateMyPlayer]
  )

  const selectHeistTarget = useCallback(
    (targetPlayerId: string) => {
      if (!myPlayerId) return

      if (roomState.role === "host" && gameEngineRef.current) {
        const result = gameEngineRef.current.processHeistTarget(myPlayerId, targetPlayerId)
        if (result) {
          const allPlayers = gameEngineRef.current.getAllPlayers()
          broadcastToGuests({ type: "HEIST_RESULT", result, allPlayers })

          const identityTheftResult = gameEngineRef.current.checkIdentityTheftAfterInteractive(myPlayerId)
          if (identityTheftResult) {
            broadcastToGuests({ type: "IDENTITY_THEFT_EVENT", result: identityTheftResult, allPlayers: gameEngineRef.current.getAllPlayers() })
            options.onIdentityTheftEvent?.(identityTheftResult)
          }

          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          options.onPlayersUpdate?.(allPlayers)
          options.onHeistResult?.(result)
          updateMyPlayer(allPlayers)
        }
      } else {
        sendToHost({ type: "HEIST_TARGET_SELECTED", playerId: myPlayerId, targetPlayerId })
      }
    },
    [broadcastToGuests, myPlayerId, options, roomState.role, sendToHost, updateMyPlayer]
  )

  const makePonziChoice = useCallback(
    (invest: boolean) => {
      if (!myPlayerId) return

      if (roomState.role === "host" && gameEngineRef.current) {
        const result = gameEngineRef.current.processPonziChoice(myPlayerId, invest)
        if (result) {
          const allPlayers = gameEngineRef.current.getAllPlayers()
          broadcastToGuests({ type: "PONZI_RESULT", result, allPlayers })

          const identityTheftResult = gameEngineRef.current.checkIdentityTheftAfterInteractive(myPlayerId)
          if (identityTheftResult) {
            broadcastToGuests({ type: "IDENTITY_THEFT_EVENT", result: identityTheftResult, allPlayers: gameEngineRef.current.getAllPlayers() })
            options.onIdentityTheftEvent?.(identityTheftResult)
          }

          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          options.onPlayersUpdate?.(allPlayers)
          options.onPonziResult?.(result)
          updateMyPlayer(allPlayers)
        }
      } else {
        sendToHost({ type: "PONZI_CHOICE", playerId: myPlayerId, invest })
      }
    },
    [broadcastToGuests, myPlayerId, options, roomState.role, sendToHost, updateMyPlayer]
  )

  const selectPoliceTarget = useCallback(
    (targetPlayerId: string) => {
      if (!myPlayerId) return

      if (roomState.role === "host" && gameEngineRef.current) {
        const result = gameEngineRef.current.processPoliceTarget(myPlayerId, targetPlayerId)
        if (result) {
          const allPlayers = gameEngineRef.current.getAllPlayers()
          broadcastToGuests({ type: "POLICE_RESULT", result, allPlayers })

          const identityTheftResult = gameEngineRef.current.checkIdentityTheftAfterInteractive(myPlayerId)
          if (identityTheftResult) {
            broadcastToGuests({ type: "IDENTITY_THEFT_EVENT", result: identityTheftResult, allPlayers: gameEngineRef.current.getAllPlayers() })
            options.onIdentityTheftEvent?.(identityTheftResult)
          }

          setRoomState((prev) => ({ ...prev, players: allPlayers }))
          options.onPlayersUpdate?.(allPlayers)
          options.onPoliceResult?.(result)
          updateMyPlayer(allPlayers)
        }
      } else {
        sendToHost({ type: "POLICE_TARGET_SELECTED", playerId: myPlayerId, targetPlayerId })
      }
    },
    [broadcastToGuests, myPlayerId, options, roomState.role, sendToHost, updateMyPlayer]
  )

  const resetGame = useCallback(() => {
    if (roomState.role !== "host" || !gameEngineRef.current) return
    gameEngineRef.current.reset()
    // Cancel any pending move resolver
    if (pendingMoveResolverRef.current) {
      pendingMoveResolverRef.current({ dieRoll: null, lapBonus: null, tileEvent: null })
      pendingMoveResolverRef.current = null
    }
    broadcastToGuests({ type: "GAME_RESET" })
    setRoomState((prev) => ({ ...prev, players: [], gameStarted: false }))
    options.onGameReset?.()
  }, [broadcastToGuests, options, roomState.role])

  const leaveGame = useCallback(() => {
    if (roomState.role === "guest" && myPlayerId) {
      sendToHost({ type: "LEAVE_GAME", playerId: myPlayerId })
    }
    // Cancel any pending move resolver
    if (pendingMoveResolverRef.current) {
      pendingMoveResolverRef.current({ dieRoll: null, lapBonus: null, tileEvent: null })
      pendingMoveResolverRef.current = null
    }
    peerRef.current?.destroy()
    peerRef.current = null
    hostConnectionRef.current = null
    connectionsRef.current.clear()
    gameEngineRef.current = null
    setRoomState({ roomCode: "", role: "guest", connectionState: "disconnected", players: [], gameStarted: false })
    setMyPlayerId(null)
    myPlayerIdRef.current = null
    setMyPlayer(null)
  }, [myPlayerId, roomState.role, sendToHost])

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
