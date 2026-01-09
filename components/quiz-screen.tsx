"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { CountdownTimer } from "./countdown-timer"
import { DiceRoller } from "./dice-roller"
import { QUESTIONS } from "@/lib/questions"
import type { Player } from "@/lib/types"
import type { EventCardData } from "./event-card"

interface QuizScreenProps {
  player: Player
  onAnswer: (questionIndex: number, answerIndex: number) => Promise<void>
  onNextQuestion: () => Promise<{ dieRoll: number | null; tileEvent: EventCardData | null }>
}

export function QuizScreen({ player, onAnswer, onNextQuestion }: QuizScreenProps) {
  const [isAnswering, setIsAnswering] = useState(false)
  const [feedback, setFeedback] = useState<{
    correct: boolean
    message: string
  } | null>(null)
  const [timerActive, setTimerActive] = useState(true)
  const [diceValue, setDiceValue] = useState<number | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [showDice, setShowDice] = useState(false)
  const feedbackRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const currentQuestion = QUESTIONS[player.currentQuestionIndex]
  const isQuizComplete = player.currentQuestionIndex >= QUESTIONS.length

  const handleTimeExpired = useCallback(() => {
    setTimerActive(false)
    setFeedback({
      correct: false,
      message: "Time expired! -50 coins",
    })

    timeoutRef.current = setTimeout(() => {
      handleNextQuestion()
    }, 1500)
  }, [])

  useEffect(() => {
    if (!feedback) return

    feedbackRef.current = setTimeout(() => {
      handleNextQuestion()
    }, 1500)

    return () => {
      if (feedbackRef.current) clearTimeout(feedbackRef.current)
    }
  }, [feedback])

  const handleSelectAnswer = async (answerIndex: number) => {
    if (isAnswering || !timerActive || player.answered) return

    setIsAnswering(true)
    setTimerActive(false)

    try {
      const response = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          playerId: player.id,
          questionIndex: player.currentQuestionIndex,
          answerIndex,
        }),
      })

      if (!response.ok) throw new Error("Failed to submit answer")

      const data = await response.json()
      setFeedback({
        correct: data.correct,
        message: data.correct ? `Correct! +100 coins` : `Wrong! -50 coins`,
      })
    } catch (error) {
      console.error("Error submitting answer:", error)
      setFeedback({
        correct: false,
        message: "Error submitting answer",
      })
    } finally {
      setIsAnswering(false)
    }
  }

  const handleNextQuestion = async () => {
    if (feedbackRef.current) clearTimeout(feedbackRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    try {
      // Show dice rolling
      setShowDice(true)
      setIsRolling(true)
      setDiceValue(null)

      const result = await onNextQuestion()

      // Set the actual dice value after animation
      if (result.dieRoll !== null) {
        setDiceValue(result.dieRoll)
      }

      // Wait for dice animation to complete
      setTimeout(() => {
        setIsRolling(false)

        // Hide dice and reset for next question
        setTimeout(() => {
          setShowDice(false)
          setDiceValue(null)
          setFeedback(null)
          setTimerActive(true)
        }, 1000)
      }, 700)
    } catch (error) {
      console.error("Error advancing to next question:", error)
      setShowDice(false)
      setIsRolling(false)
    }
  }

  if (isQuizComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center space-y-2">
          <span className="text-4xl">🎉</span>
          <h1 className="text-2xl font-bold text-white">Quiz Complete!</h1>
          <p className="text-lg text-purple-300">
            Final Score: <span className="text-yellow-400 font-bold">{player.coins}</span> coins
          </p>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-purple-300">Loading question...</p>
      </div>
    )
  }

  // Answer button colors
  const buttonColors = [
    "from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 border-red-400",
    "from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 border-blue-400",
    "from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 border-yellow-400",
    "from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-green-400",
  ]

  return (
    <div className="flex flex-col h-full gap-2 relative">
      {/* Dice overlay when rolling */}
      {showDice && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center rounded-xl">
          <div className="text-center">
            <DiceRoller value={diceValue} isRolling={isRolling} />
            {!isRolling && diceValue !== null && (
              <p className="text-white mt-2 text-sm animate-bounce-in">Moving {diceValue} spaces!</p>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-purple-300">
            Question {player.currentQuestionIndex + 1} of {QUESTIONS.length}
          </span>
          <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">
            <span>🪙</span> {player.coins}
          </span>
        </div>
        <div className="w-full bg-purple-900/50 rounded-full h-1.5">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-cyan-500 rounded-full transition-all duration-300"
            style={{
              width: `${((player.currentQuestionIndex + 1) / QUESTIONS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question and Timer row */}
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <h2 className="text-base font-bold text-white text-pretty leading-snug">{currentQuestion.question}</h2>
        </div>
        <div className="flex-shrink-0">
          <CountdownTimer
            initialSeconds={20}
            onTimeExpired={handleTimeExpired}
            isActive={timerActive && !player.answered}
          />
        </div>
      </div>

      {/* Answer buttons - 2x2 grid */}
      <div className="grid grid-cols-2 gap-2 flex-1">
        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelectAnswer(index)}
            disabled={isAnswering || !timerActive || player.answered || feedback !== null}
            className={`
              relative rounded-xl border-2 p-2
              bg-gradient-to-br ${buttonColors[index]}
              text-white font-medium text-sm text-left
              transition-all duration-200
              hover:scale-[1.02] hover:shadow-lg
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              flex items-start gap-2
            `}
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 font-bold flex-shrink-0 text-xs">
              {String.fromCharCode(65 + index)}
            </span>
            <span className="flex-1 line-clamp-3">{option}</span>
          </button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`
            p-2 rounded-xl text-center text-sm font-bold
            animate-bounce-in
            ${
              feedback.correct
                ? "bg-green-500/20 border-2 border-green-500/50 text-green-400"
                : "bg-red-500/20 border-2 border-red-500/50 text-red-400"
            }
          `}
        >
          <span className="mr-2">{feedback.correct ? "✅" : "❌"}</span>
          {feedback.message}
        </div>
      )}
    </div>
  )
}
