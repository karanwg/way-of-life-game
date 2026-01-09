import { type NextRequest, NextResponse } from "next/server"
import { gameEventEmitter, getAllPlayers } from "@/lib/game-store"
import type { GameEvent } from "@/lib/types"

export async function GET(request: NextRequest) {
  // Create SSE stream for real-time updates
  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const players = getAllPlayers()
      const initialEvent: GameEvent = {
        type: "GAME_STATE_UPDATE",
        players,
      }
      controller.enqueue(`data: ${JSON.stringify(initialEvent)}\n\n`)

      // Listen for game events
      const onGameEvent = (event: GameEvent) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`)
        } catch (error) {
          console.error("Error sending event:", error)
        }
      }

      gameEventEmitter.on("game-event", onGameEvent)

      // Cleanup on client disconnect
      const cleanup = () => {
        gameEventEmitter.removeListener("game-event", onGameEvent)
        controller.close()
      }

      request.signal.addEventListener("abort", cleanup)

      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(": keepalive\n\n")
        } catch (error) {
          clearInterval(keepaliveInterval)
          cleanup()
        }
      }, 30000)
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
