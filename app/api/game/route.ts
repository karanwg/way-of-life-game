import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import type { Player } from "@/lib/types"
import {
  addPlayer,
  updatePlayerAnswer,
  advanceQuestion,
  resetGameState,
  getPlayer,
  getAllPlayers,
} from "@/lib/game-store"
import { QUESTIONS } from "@/lib/questions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, playerName, playerId, questionIndex, answerIndex } = body

    if (action === "join") {
      const newPlayerId = randomUUID()
      const newPlayer: Player = {
        id: newPlayerId,
        name: playerName,
        coins: 0,
        currentQuestionIndex: 0,
        answered: false,
        selectedAnswer: null,
        currentTileId: 0,
        lapsCompleted: 0,
        skippedNextQuestion: false,
        nextRolledMax: null,
      }
      addPlayer(newPlayer)
      return NextResponse.json({
        success: true,
        playerId: newPlayerId,
        player: newPlayer,
      })
    }

    if (action === "answer") {
      // Player submits an answer
      const result = updatePlayerAnswer(playerId, questionIndex, answerIndex)
      if (!result) {
        return NextResponse.json({ success: false, error: "Player or question not found" }, { status: 400 })
      }
      return NextResponse.json({
        success: true,
        correct: result.correct,
        newCoins: result.newCoins,
        question: QUESTIONS[questionIndex],
      })
    }

    if (action === "next-question") {
      // Advance to the next question
      advanceQuestion(playerId)
      const player = getPlayer(playerId)
      return NextResponse.json({
        success: true,
        player,
        nextQuestionIndex: player?.currentQuestionIndex,
      })
    }

    if (action === "get-state") {
      // Get current game state
      const players = getAllPlayers()
      const player = getPlayer(playerId)
      return NextResponse.json({
        success: true,
        players,
        currentPlayer: player,
      })
    }

    if (action === "reset") {
      // Admin reset button
      resetGameState()
      return NextResponse.json({ success: true, message: "Game reset" })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in game route:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
