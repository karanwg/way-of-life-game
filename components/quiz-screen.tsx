/**
 * QuizScreen - Main quiz interface component
 * 
 * This component handles the question-answer flow:
 * 1. Display current question with countdown timer
 * 2. Player selects an answer (or timer expires)
 * 3. Show feedback (correct/wrong)
 * 4. If correct: Roll dice and move (handled by parent)
 * 5. Advance to next question
 * 
 * SCORING:
 * - Correct answer: +300 coins
 * - Wrong answer: +0 coins
 * - Timer expired: +0 coins (treated as wrong)
 * 
 * FLOW CONTROL:
 * - isActive prop controls whether timer runs
 * - Set to false when modals are open or not in quiz view
 * - isLocked prevents rapid answering after wrong answer
 */

"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { CountdownTimer } from "./countdown-timer"
import { AnswerResultOverlay } from "./answer-result-overlay"
import { QUESTIONS } from "@/lib/questions"
import { playLoseMoneySound } from "@/lib/sounds"
import type { Player } from "@/lib/types"
import type { EventCardData } from "./event-card"

interface QuizScreenProps {
  player: Player
  onAnswer: (questionIndex: number, answerIndex: number) => Promise<void>
  onNextQuestion: (wasCorrect: boolean) => Promise<{ dieRoll: number | null; dieRolls?: number[]; tileEvent: EventCardData | null }>
  onDiceRoll?: (dieRoll: number | null, isRolling: boolean, dieRolls?: number[]) => void
  onSessionExpired?: () => void
  /** When false, timer is paused and input is disabled */
  isActive?: boolean
}

// Button color styles (Monopoly-inspired)
const BUTTON_STYLES = [
  "from-red-500 to-red-600 border-red-700 shadow-red-500/30",
  "from-sky-500 to-sky-600 border-sky-700 shadow-sky-500/30",
  "from-amber-500 to-amber-600 border-amber-700 shadow-amber-500/30",
  "from-green-500 to-green-600 border-green-700 shadow-green-500/30",
]

export function QuizScreen({ 
  player, 
  onAnswer, 
  onNextQuestion, 
  onDiceRoll, 
  onSessionExpired, 
  isActive = true 
}: QuizScreenProps) {
  // UI state
  const [isAnswering, setIsAnswering] = useState(false)
  const [timerActive, setTimerActive] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [showResultOverlay, setShowResultOverlay] = useState<{ correct: boolean; coins: number } | null>(null)

  // Refs for cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Current question data
  const currentQuestion = QUESTIONS[player.currentQuestionIndex]
  const isQuizComplete = player.currentQuestionIndex >= QUESTIONS.length

  // Control timer based on active state and overlay
  useEffect(() => {
    if (isActive && !showResultOverlay && !isLocked) {
      setTimerActive(true)
    } else if (!isActive) {
      setTimerActive(false)
    }
  }, [isActive, showResultOverlay, isLocked])

  /**
   * Handle timer expiration
   * Treated as a wrong answer
   */
  const handleTimeExpired = useCallback(() => {
    setTimerActive(false)
    playLoseMoneySound()
    // Show dramatic overlay for timeout
    setShowResultOverlay({ correct: false, coins: 0 })
  }, [])

  /**
   * Handle overlay completion - advance to next question
   */
  const handleOverlayComplete = useCallback(() => {
    if (showResultOverlay) {
      const wasCorrect = showResultOverlay.correct
      setShowResultOverlay(null)
      handleNextQuestion(wasCorrect)
    }
  }, [showResultOverlay])

  /**
   * Handle answer selection
   */
  const handleSelectAnswer = async (answerIndex: number) => {
    // Guard against invalid clicks
    if (isAnswering || !timerActive || player.answered || showResultOverlay !== null) {
      return
    }

    setIsAnswering(true)
    setTimerActive(false)

    try {
      const question = QUESTIONS[player.currentQuestionIndex]
      const correct = question ? answerIndex === question.correctAnswerIndex : false
      
      await onAnswer(player.currentQuestionIndex, answerIndex)
      
      if (!correct) playLoseMoneySound()
      
      // Show dramatic overlay instead of inline feedback
      setShowResultOverlay({ correct, coins: correct ? 300 : 0 })
    } catch (error) {
      console.error("Error submitting answer:", error)
      setShowResultOverlay({ correct: false, coins: 0 })
      onSessionExpired?.()
    } finally {
      setIsAnswering(false)
    }
  }

  /**
   * Advance to the next question
   * If answer was correct, triggers dice roll and movement
   */
  const handleNextQuestion = async (wasCorrect: boolean) => {
    // Clear any pending timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    try {
      const result = await onNextQuestion(wasCorrect)
      
      if (wasCorrect && result.dieRoll !== null) {
        // Show dice rolling animation
        onDiceRoll?.(result.dieRoll, true, result.dieRolls)
        
        // After roll animation, show final value briefly
        setTimeout(() => {
          onDiceRoll?.(result.dieRoll, false, result.dieRolls)
          
          // Then hide dice and reset for next question
          setTimeout(() => {
            onDiceRoll?.(null, false)
            setTimerActive(true)
            setIsLocked(false)
          }, 1000)
        }, 700)
      } else {
        // No dice roll (wrong answer) - just reset
        onDiceRoll?.(null, false)
        setTimerActive(true)
        setIsLocked(false)
      }
    } catch (error) {
      console.error("Error advancing:", error)
      onDiceRoll?.(null, false)
      setIsLocked(false)
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  // Quiz complete screen
  if (isQuizComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🎉</span>
          <h1 className="text-3xl font-black text-green-700 mb-2">Quiz Complete!</h1>
          <p className="text-xl text-gray-700">
            Final Score: <span className="text-amber-600 font-black">{player.coins}</span> coins
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Loading question...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <span className="text-amber-800 text-sm font-semibold">
          Question {player.currentQuestionIndex + 1} / {QUESTIONS.length}
        </span>
        <span className="text-amber-700 font-bold flex items-center gap-1 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
          🪙 {player.coins}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-amber-100 rounded-full h-2 border border-amber-200">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
          style={{ width: `${((player.currentQuestionIndex + 1) / QUESTIONS.length) * 100}%` }}
        />
      </div>

      {/* Question + Timer */}
      <div className="flex gap-4 items-start bg-white rounded-xl p-5 border-2 border-amber-200 shadow-sm">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800 leading-relaxed">
            {currentQuestion.question}
          </h2>
        </div>
        <div className="flex-shrink-0">
          <CountdownTimer
            initialSeconds={20}
            onTimeExpired={handleTimeExpired}
            isActive={timerActive && !player.answered}
            resetKey={player.currentQuestionIndex}
          />
        </div>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelectAnswer(index)}
            disabled={isAnswering || !timerActive || player.answered || showResultOverlay !== null || isLocked}
            className={`
              relative rounded-xl p-4
              bg-gradient-to-b ${BUTTON_STYLES[index]}
              text-white font-bold text-left
              transition-all duration-200 shadow-lg
              border-b-4
              hover:-translate-y-0.5 hover:shadow-xl
              active:translate-y-0 active:border-b-2
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0
              flex items-start gap-3
            `}
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 font-black flex-shrink-0">
              {String.fromCharCode(65 + index)}
            </span>
            <span className="flex-1 text-sm leading-snug">{option}</span>
          </button>
        ))}
      </div>

      {/* Answer Result Overlay */}
      {showResultOverlay && (
        <AnswerResultOverlay
          isCorrect={showResultOverlay.correct}
          coins={showResultOverlay.coins}
          onComplete={handleOverlayComplete}
        />
      )}
    </div>
  )
}
