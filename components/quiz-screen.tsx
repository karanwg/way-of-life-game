"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { CountdownTimer } from "./countdown-timer"
import { QUESTIONS } from "@/lib/questions"
import { playLoseMoneySound } from "@/lib/sounds"
import type { Player } from "@/lib/types"
import type { EventCardData } from "./event-card"

interface QuizScreenProps {
  player: Player
  onAnswer: (questionIndex: number, answerIndex: number) => Promise<void>
  onNextQuestion: (wasCorrect: boolean) => Promise<{ dieRoll: number | null; tileEvent: EventCardData | null }>
  onDiceRoll?: (dieRoll: number | null, isRolling: boolean) => void
  onSessionExpired?: () => void
  /** Whether the quiz is currently active (visible and no modals blocking). Timer only runs when true. */
  isActive?: boolean
}

export function QuizScreen({ player, onAnswer, onNextQuestion, onDiceRoll, onSessionExpired, isActive = true }: QuizScreenProps) {
  const [isAnswering, setIsAnswering] = useState(false)
  const [feedback, setFeedback] = useState<{
    correct: boolean
    message: string
  } | null>(null)
  const [timerActive, setTimerActive] = useState(false) // Start paused, activate when isActive
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const feedbackRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const currentQuestion = QUESTIONS[player.currentQuestionIndex]
  const isQuizComplete = player.currentQuestionIndex >= QUESTIONS.length

  // Activate timer when quiz becomes active (and not showing feedback)
  useEffect(() => {
    if (isActive && !feedback && !isLocked) {
      setTimerActive(true)
    } else if (!isActive) {
      setTimerActive(false)
    }
  }, [isActive, feedback, isLocked])

  const handleTimeExpired = useCallback(() => {
    setTimerActive(false)
    setLastAnswerCorrect(false)
    playLoseMoneySound()
    setFeedback({
      correct: false,
      message: "Time expired! -50 coins",
    })
  }, [])

  useEffect(() => {
    if (!feedback) return

    const delay = feedback.correct ? 1500 : 5000

    if (!feedback.correct) {
      setIsLocked(true)
    }

    feedbackRef.current = setTimeout(() => {
      handleNextQuestion(feedback.correct)
    }, delay)

    return () => {
      if (feedbackRef.current) clearTimeout(feedbackRef.current)
    }
  }, [feedback])

  const handleSelectAnswer = async (answerIndex: number) => {
    if (isAnswering || !timerActive || player.answered || feedback !== null) return

    setIsAnswering(true)
    setTimerActive(false)

    try {
      // Check answer correctness locally
      const question = QUESTIONS[player.currentQuestionIndex]
      const correct = question ? answerIndex === question.correctAnswerIndex : false

      // Submit answer via P2P
      await onAnswer(player.currentQuestionIndex, answerIndex)

      // Play sound effect only for wrong answers (cha-ching is for chance-based gains only)
      if (!correct) {
        playLoseMoneySound()
      }

      setLastAnswerCorrect(correct)
      setFeedback({
        correct,
        message: correct ? `Correct! +100 coins` : `Wrong! -50 coins`,
      })
    } catch (error) {
      console.error("Error submitting answer:", error)
      setLastAnswerCorrect(false)
      setFeedback({
        correct: false,
        message: "Error submitting answer. Please refresh.",
      })
      onSessionExpired?.()
    } finally {
      setIsAnswering(false)
    }
  }

  const handleNextQuestion = async (wasCorrect: boolean) => {
    if (feedbackRef.current) clearTimeout(feedbackRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    try {
      const result = await onNextQuestion(wasCorrect)

      // Only show dice animation if we actually got a die roll
      if (wasCorrect && result.dieRoll !== null) {
        // Notify parent to show dice on board
        onDiceRoll?.(result.dieRoll, true)

        // Wait for dice animation to complete
        setTimeout(() => {
          onDiceRoll?.(result.dieRoll, false)

          setTimeout(() => {
            onDiceRoll?.(null, false)
            setFeedback(null)
            setTimerActive(true)
            setIsLocked(false)
          }, 1000)
        }, 700)
      } else {
        // No dice roll (wrong answer or skipped due to debuff)
        onDiceRoll?.(null, false)
        setFeedback(null)
        setTimerActive(true)
        setIsLocked(false)
      }
    } catch (error) {
      console.error("Error advancing to next question:", error)
      onDiceRoll?.(null, false)
      setIsLocked(false)
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

  const buttonColors = [
    "from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 border-red-400",
    "from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 border-blue-400",
    "from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 border-yellow-400",
    "from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-green-400",
  ]

  return (
    <div className="flex flex-col h-full gap-2 relative">
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
            disabled={isAnswering || !timerActive || player.answered || feedback !== null || isLocked}
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
          {!feedback.correct && isLocked && <span className="ml-2 text-red-300 text-xs">(locked for 5s)</span>}
        </div>
      )}
    </div>
  )
}
