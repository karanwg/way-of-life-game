/**
 * useGame - Main game hook combining state and networking
 * 
 * This hook provides a clean interface for the UI to interact with the game.
 * It combines:
 * - GameStore for state management
 * - HostEngine or GuestClient for networking
 * 
 * The UI only needs to use this one hook for all game functionality.
 * 
 * ARCHITECTURE NOTES:
 * - Uses refs for network instances to persist across renders
 * - Uses a ref for the event handler to avoid stale closures
 * - Timeouts are tracked and cleaned up on unmount
 */

"use client"

import { useCallback, useRef, useEffect } from "react"
import { useGameStore } from "./use-game-store"
import { HostEngine, GuestClient, type NetworkEvent, type MoveResultForNetwork } from "@/lib/network"

export function useGame() {
  const store = useGameStore()
  
  // Network layer (either host or guest)
  const hostRef = useRef<HostEngine | null>(null)
  const guestRef = useRef<GuestClient | null>(null)
  
  // Track pending timeouts for cleanup
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set())
  
  // Track last die roll for dynamic animation timing
  const lastDieRollRef = useRef<number>(1)
  
  // Use a ref to always have the latest store actions without stale closures
  const storeRef = useRef(store)
  storeRef.current = store

  // ============================================================================
  // TIMEOUT HELPER - Tracks timeouts for proper cleanup
  // ============================================================================
  
  const scheduleTimeout = useCallback((fn: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      timeoutsRef.current.delete(timeout)
      fn()
    }, delay)
    timeoutsRef.current.add(timeout)
    return timeout
  }, [])

  // ============================================================================
  // NETWORK EVENT HANDLER
  // Uses refs to avoid stale closures - network classes keep a reference to this
  // ============================================================================

  const handleNetworkEvent = useCallback((event: NetworkEvent) => {
    // Always use storeRef.current to get the latest store actions
    const s = storeRef.current
    
    switch (event.type) {
      case "connected":
        // Only update roomCode if provided (guests already have it from joinRoom)
        s.setConnection("connected", event.roomCode || undefined)
        break

      case "disconnected":
        s.setConnection("disconnected")
        break

      case "error":
        s.setConnection("error")
        console.error("Network error:", event.message)
        break

      case "identity_assigned":
        s.setMyPlayer(event.playerId, event.player)
        s.updatePlayers(event.allPlayers)
        break

      case "player_joined":
      case "player_left":
      case "players_updated":
        s.updatePlayers(event.allPlayers)
        break

      case "game_started":
        s.updatePlayers(event.allPlayers)
        s.startGame()
        break

      case "game_reset":
        s.resetGame()
        break

      case "host_disconnected":
        s.setConnection("error")
        break

      case "answer_result":
        s.updatePlayers(event.allPlayers)
        break

      case "move_result":
        s.updatePlayers(event.allPlayers)
        if (event.dieRoll !== null) {
          s.startDiceRoll(event.dieRoll, event.dieRolls)
          
          // Store die roll for prompt timing calculation
          lastDieRollRef.current = event.dieRoll
          
          // Calculate dynamic delay based on die roll
          // Animation: 1900ms start delay + (tiles * 450ms per hop) + 400ms buffer
          const animationDelay = 1900 + (event.dieRoll * 450) + 400
          
          // Clear dice overlay after dice animation (before pawn finishes moving)
          // Dice shows for ~2s, then we hide it so pawn movement is visible
          scheduleTimeout(() => {
            storeRef.current.clearDice()
          }, 2000)
          
          // Determine what happens after dice/movement animation
          const hasNotification = event.lapBonus || event.tileEvent
          
          // Get the player's destination tile ID
          const myPlayer = event.allPlayers.find(p => p.id === storeRef.current.state.myPlayerId)
          const landedTileId = myPlayer?.currentTileId
          
          // Set landed tile highlight slightly before pawn fully lands (reduce perceived gap)
          // Subtract 200ms from animation delay so glow appears as pawn is landing
          const glowDelay = Math.max(0, animationDelay - 200)
          if (landedTileId !== undefined && hasNotification) {
            scheduleTimeout(() => {
              storeRef.current.setLandedTile(landedTileId)
            }, glowDelay)
          }
          
          // Add 1 second delay after landing before showing notification
          const notificationExtraDelay = 1000
          
          if (event.lapBonus) {
            // Schedule lap bonus notification after landing + glow pause
            scheduleTimeout(() => {
              storeRef.current.showNotification({ type: "lap_bonus", data: event.lapBonus! })
            }, animationDelay + notificationExtraDelay)
          }
          if (event.tileEvent) {
            // Schedule after lap bonus if present, otherwise after animation + glow pause
            const tileEventDelay = event.lapBonus 
              ? animationDelay + notificationExtraDelay + 500 
              : animationDelay + notificationExtraDelay
            scheduleTimeout(() => {
              storeRef.current.showNotification({ type: "tile_event", data: event.tileEvent! })
            }, tileEventDelay)
          }
          
          // If no notification will be shown, auto-complete turn after animation
          if (!hasNotification) {
            scheduleTimeout(() => {
              // Only complete if no pending interaction appeared
              if (storeRef.current.state.pendingInteraction === null) {
                storeRef.current.completeTurn()
              }
            }, animationDelay)
          }
        }
        break

      case "heist_prompt": {
        // Set pending interaction IMMEDIATELY to prevent view switch to quiz
        storeRef.current.setPendingInteraction("heist", event.data)
        
        // Set tile glow when pawn lands
        const glowDelay = 1900 + (lastDieRollRef.current * 450)
        const myPlayer = storeRef.current.state.allPlayers.find(p => p.id === storeRef.current.state.myPlayerId)
        if (myPlayer?.currentTileId !== undefined) {
          scheduleTimeout(() => {
            storeRef.current.setLandedTile(myPlayer.currentTileId)
          }, glowDelay)
        }
        // Show modal 1 second after pawn lands
        const modalDelay = glowDelay + 1000
        scheduleTimeout(() => {
          storeRef.current.setInteractionReady()
        }, modalDelay)
        break
      }

      case "ponzi_prompt": {
        // Set pending interaction IMMEDIATELY to prevent view switch to quiz
        storeRef.current.setPendingInteraction("ponzi", event.data)
        
        // Set tile glow when pawn lands
        const glowDelay = 1900 + (lastDieRollRef.current * 450)
        const myPlayer = storeRef.current.state.allPlayers.find(p => p.id === storeRef.current.state.myPlayerId)
        if (myPlayer?.currentTileId !== undefined) {
          scheduleTimeout(() => {
            storeRef.current.setLandedTile(myPlayer.currentTileId)
          }, glowDelay)
        }
        // Show modal 1 second after pawn lands (after glow is visible)
        const modalDelay = glowDelay + 1000
        scheduleTimeout(() => {
          storeRef.current.setInteractionReady()
        }, modalDelay)
        break
      }

      case "police_prompt": {
        // Set pending interaction IMMEDIATELY to prevent view switch to quiz
        storeRef.current.setPendingInteraction("police", event.data)
        
        // Set tile glow when pawn lands
        const glowDelay = 1900 + (lastDieRollRef.current * 450)
        const myPlayer = storeRef.current.state.allPlayers.find(p => p.id === storeRef.current.state.myPlayerId)
        if (myPlayer?.currentTileId !== undefined) {
          scheduleTimeout(() => {
            storeRef.current.setLandedTile(myPlayer.currentTileId)
          }, glowDelay)
        }
        // Show modal 1 second after pawn lands
        const modalDelay = glowDelay + 1000
        scheduleTimeout(() => {
          storeRef.current.setInteractionReady()
        }, modalDelay)
        break
      }

      case "swap_meet_prompt": {
        // Set pending interaction IMMEDIATELY to prevent view switch to quiz
        storeRef.current.setPendingInteraction("swap_meet", event.data)
        
        // Set tile glow when pawn lands
        const glowDelay = 1900 + (lastDieRollRef.current * 450)
        const myPlayer = storeRef.current.state.allPlayers.find(p => p.id === storeRef.current.state.myPlayerId)
        if (myPlayer?.currentTileId !== undefined) {
          scheduleTimeout(() => {
            storeRef.current.setLandedTile(myPlayer.currentTileId)
          }, glowDelay)
        }
        // Show modal 1 second after pawn lands
        const modalDelay = glowDelay + 1000
        scheduleTimeout(() => {
          storeRef.current.setInteractionReady()
        }, modalDelay)
        break
      }

      case "heist_result": {
        // Only clear pending interaction if I was the thief (the one who made the choice)
        // If I'm just the victim, I might have my own pending action that shouldn't be cleared
        const myId = storeRef.current.state.myPlayerId
        const isActor = event.data.thiefId === myId
        if (isActor) {
          s.clearPendingInteraction()
        }
        s.updatePlayers(event.allPlayers)
        if (event.data.amountStolen > 0) {
          s.startFlyingCoins(event.data.victimId, event.data.thiefId, event.data.amountStolen)
        }
        scheduleTimeout(() => {
          const store = storeRef.current
          const notification = { type: "heist_result" as const, data: event.data, isVictim: event.isVictim }
          // Queue if victim has pending interaction, otherwise show immediately
          if (!isActor && store.state.pendingInteraction) {
            store.queueNotification(notification)
          } else {
            store.showNotification(notification)
          }
        }, 600)
        break
      }

      case "ponzi_result": {
        // Ponzi is single-player, always show immediately and clear
        const myId = storeRef.current.state.myPlayerId
        if (event.data.playerId === myId) {
          s.clearPendingInteraction()
        }
        s.updatePlayers(event.allPlayers)
        s.showNotification({ type: "ponzi_result", data: event.data })
        break
      }

      case "police_result": {
        // Only clear if I was the snitch (the one who made the choice)
        const myId = storeRef.current.state.myPlayerId
        const isActor = event.data.snitchId === myId
        if (isActor) {
          s.clearPendingInteraction()
        }
        s.updatePlayers(event.allPlayers)
        const notification = { type: "police_result" as const, data: event.data, isVictim: event.isVictim }
        // Queue if victim has pending interaction, otherwise show immediately
        if (!isActor && s.state.pendingInteraction) {
          s.queueNotification(notification)
        } else {
          s.showNotification(notification)
        }
        break
      }

      case "swap_meet_result": {
        // Only clear if I was the swapper (the one who made the choice)
        const myId = storeRef.current.state.myPlayerId
        const isActor = event.data.swapperId === myId
        if (isActor) {
          s.clearPendingInteraction()
        }
        s.updatePlayers(event.allPlayers)
        const swapResult = event.data
        
        // Only show flying coins animation if a swap actually happened
        if (swapResult.targetId) {
          if (swapResult.swapperNewCoins > swapResult.swapperOldCoins) {
            // Swapper gained, so coins fly from target to swapper
            s.startFlyingCoins(swapResult.targetId, swapResult.swapperId, swapResult.swapperNewCoins - swapResult.swapperOldCoins)
          } else if (swapResult.swapperNewCoins < swapResult.swapperOldCoins) {
            // Swapper lost, so coins fly from swapper to target
            s.startFlyingCoins(swapResult.swapperId, swapResult.targetId, swapResult.swapperOldCoins - swapResult.swapperNewCoins)
          }
          scheduleTimeout(() => {
            const store = storeRef.current
            const notification = { type: "swap_meet_result" as const, data: event.data, isTarget: event.isTarget }
            // Queue if target has pending interaction, otherwise show immediately
            if (!isActor && store.state.pendingInteraction) {
              store.queueNotification(notification)
            } else {
              store.showNotification(notification)
            }
          }, 600)
        } else {
          // Skipped - show notification immediately (only to swapper)
          if (!event.isTarget) {
            s.showNotification({ type: "swap_meet_result", data: event.data, isTarget: false })
          }
        }
        break
      }

      case "identity_theft":
        s.updatePlayers(event.allPlayers)
        scheduleTimeout(() => {
          const store = storeRef.current
          const notification = { type: "identity_theft" as const, data: event.data }
          // Queue if player has pending interaction
          if (store.state.pendingInteraction) {
            store.queueNotification(notification)
          } else {
            store.showNotification(notification)
          }
        }, 4000)
        break

      case "impacted_by_event":
        scheduleTimeout(() => {
          const store = storeRef.current
          const notification = {
            type: "impact_toast" as const,
            data: {
              message: `${event.triggeredByName}: ${event.tileName}`,
              coinsDelta: event.coinsDelta,
              triggeredBy: event.triggeredByName,
            },
          }
          // Queue if player has pending interaction
          if (store.state.pendingInteraction) {
            store.queueNotification(notification)
          } else {
            store.showNotification(notification)
          }
        }, 4000)
        break
    }
  }, [scheduleTimeout]) // Only depends on scheduleTimeout which is stable

  // ============================================================================
  // ROOM MANAGEMENT
  // ============================================================================

  /** Create a new room as host */
  const createRoom = useCallback(async (hostName: string) => {
    // Clean up any existing connection
    hostRef.current?.disconnect()
    guestRef.current?.disconnect()
    hostRef.current = null
    guestRef.current = null
    
    storeRef.current.setConnection("connecting", "", true)
    
    const host = new HostEngine(handleNetworkEvent)
    hostRef.current = host
    
    // createRoom is async due to dynamic PeerJS import
    const roomCode = await host.createRoom(hostName)
    storeRef.current.setConnection("connecting", roomCode, true)
  }, [handleNetworkEvent])

  /** Join an existing room as guest */
  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    // Clean up any existing connection
    hostRef.current?.disconnect()
    guestRef.current?.disconnect()
    hostRef.current = null
    guestRef.current = null
    
    storeRef.current.setConnection("connecting", roomCode.toUpperCase(), false)
    
    const guest = new GuestClient(handleNetworkEvent)
    guestRef.current = guest
    
    // joinRoom is async due to dynamic PeerJS import
    await guest.joinRoom(roomCode, playerName)
  }, [handleNetworkEvent])

  /** Leave the current room */
  const leaveRoom = useCallback(() => {
    hostRef.current?.disconnect()
    guestRef.current?.disconnect()
    hostRef.current = null
    guestRef.current = null
    storeRef.current.resetGame()
  }, [])

  // ============================================================================
  // GAME ACTIONS
  // ============================================================================

  /** Start the game (host only) */
  const startGame = useCallback(() => {
    hostRef.current?.startGame()
  }, [])

  /** Submit an answer to the current question */
  const submitAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    if (hostRef.current) {
      hostRef.current.submitAnswer(questionIndex, answerIndex)
    } else if (guestRef.current) {
      guestRef.current.submitAnswer(questionIndex, answerIndex)
    }
  }, [])

  /** Advance to next question (triggers dice roll if correct) */
  const advanceQuestion = useCallback(async (wasCorrect: boolean): Promise<MoveResultForNetwork> => {
    if (hostRef.current) {
      return hostRef.current.advanceQuestion(wasCorrect)
    } else if (guestRef.current) {
      return guestRef.current.advanceQuestion(wasCorrect)
    }
    return { dieRoll: null, dieRolls: [], lapBonus: null, tileEvent: null }
  }, [])

  /** Select a target for heist */
  const selectHeistTarget = useCallback((targetId: string) => {
    if (hostRef.current) {
      hostRef.current.selectHeistTarget(targetId)
    } else if (guestRef.current) {
      guestRef.current.selectHeistTarget(targetId)
    }
  }, [])

  /** Make a choice on the ponzi/gamble tile */
  const makePonziChoice = useCallback((invest: boolean, spinResult?: boolean) => {
    if (hostRef.current) {
      hostRef.current.makePonziChoice(invest, spinResult)
    } else if (guestRef.current) {
      guestRef.current.makePonziChoice(invest, spinResult)
    }
  }, [])

  /** Select a target for police report */
  const selectPoliceTarget = useCallback((targetId: string) => {
    if (hostRef.current) {
      hostRef.current.selectPoliceTarget(targetId)
    } else if (guestRef.current) {
      guestRef.current.selectPoliceTarget(targetId)
    }
  }, [])

  /** Select a target for swap meet */
  const selectSwapMeetTarget = useCallback((targetId: string) => {
    if (hostRef.current) {
      hostRef.current.selectSwapMeetTarget(targetId)
    } else if (guestRef.current) {
      guestRef.current.selectSwapMeetTarget(targetId)
    }
  }, [])

  /** Reset the game (host only) */
  const resetGame = useCallback(() => {
    hostRef.current?.resetGame()
  }, [])

  /** 
   * Dismiss notification and check if turn should complete.
   * Returns to quiz if no more blocking UI.
   */
  const dismissNotificationAndCheckTurn = useCallback(() => {
    // Get state BEFORE dismissing to check conditions
    const state = storeRef.current.state
    
    // Check if this is a turn-ending notification
    // (tile_event, lap_bonus, heist_result, ponzi_result, police_result, identity_theft)
    const isTurnNotification = state.activeNotification !== null
    
    // Dismiss the notification
    storeRef.current.dismissNotification()
    
    // Only complete turn if:
    // - We just dismissed a notification
    // - No pending interaction (heist/ponzi/police modal)
    // - We're in the playing phase
    // - Dice is not rolling
    const shouldCompleteTurn = 
      isTurnNotification &&
      state.pendingInteraction === null &&
      state.gamePhase === "playing" &&
      !state.isDiceRolling
    
    if (shouldCompleteTurn) {
      // Delay to allow React to process the dismissal and any animations
      scheduleTimeout(() => {
        storeRef.current.completeTurn()
      }, 300)
    }
  }, [scheduleTimeout])

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      // Disconnect network
      hostRef.current?.disconnect()
      guestRef.current?.disconnect()
      
      // Clear all pending timeouts
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      timeoutsRef.current.clear()
    }
  }, [])

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    state: store.state,
    
    // Derived state
    canAnswer: store.canAnswer,
    hasBlockingUI: store.hasBlockingUI,
    isGameComplete: store.isGameComplete,
    myRank: store.myRank,
    
    // Room management
    createRoom,
    joinRoom,
    leaveRoom,
    
    // Game actions
    startGame,
    submitAnswer,
    advanceQuestion,
    selectHeistTarget,
    makePonziChoice,
    selectPoliceTarget,
    selectSwapMeetTarget,
    resetGame,
    
    // UI state management (from store)
    setView: store.setView,
    dismissNotification: dismissNotificationAndCheckTurn,
    onCountdownComplete: store.onCountdownComplete,
    onDiceRollComplete: store.onDiceRollComplete,
    onMovementComplete: store.onMovementComplete,
    completeTurn: store.completeTurn,
    stopFlyingCoins: store.stopFlyingCoins,
  }
}

export type GameHookReturn = ReturnType<typeof useGame>
