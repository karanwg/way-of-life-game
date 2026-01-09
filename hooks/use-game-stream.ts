"use client"

import { useEffect, useRef } from "react"
import type { GameEvent } from "@/lib/types"

export function useGameStream(onEvent: (event: GameEvent) => void) {
  const onEventRef = useRef(onEvent)
  const lastSeenPlayersRef = useRef<string>("")

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null

    const poll = async () => {
      try {
        const response = await fetch("/api/game/state")
        if (!response.ok) throw new Error("Failed to fetch game state")

        const data = await response.json()
        const currentState = JSON.stringify(data.players)

        // Only emit event if players have changed
        if (currentState !== lastSeenPlayersRef.current) {
          lastSeenPlayersRef.current = currentState
          onEventRef.current({
            type: "GAME_STATE_UPDATE",
            players: data.players,
          })
        }
      } catch (error) {
        console.error("[v0] Error polling game state:", error)
      }
    }

    poll()
    pollInterval = setInterval(poll, 500)

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [])
}
