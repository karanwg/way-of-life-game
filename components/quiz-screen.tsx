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
  onNextQuestion: (wasCorrect: boolean) => Promise<{ dieRoll: number | null; dieRolls?: number[]; tileEvent: EventCardData | null }>
  onDiceRoll?: (dieRoll: number | null, isRolling: boolean, dieRolls?: number[]) => void
  onSessionExpired?: () => void
  isActive?: boolean
}

export function QuizScreen({ player, onAnswer, onNextQuestion, onDiceRoll, onSessionExpired, isActive = true }: QuizScreenProps) {
  const [isAnswering, setIsAnswering] = useState(false)
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [timerActive, setTimerActive] = useState(false)
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const feedbackRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const currentQuestion = QUESTIONS[player.currentQuestionIndex]
  const isQuizComplete = player.currentQuestionIndex >= QUESTIONS.length

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
    setFeedback({ correct: false, message: "Time expired! -50 coins" })
  }, [])

  useEffect(() => {
    if (!feedback) return
    const delay = feedback.correct ? 1500 : 2000
    if (!feedback.correct) setIsLocked(true)
    feedbackRef.current = setTimeout(() => handleNextQuestion(feedback.correct), delay)
    return () => { if (feedbackRef.current) clearTimeout(feedbackRef.current) }
  }, [feedback])

  const handleSelectAnswer = async (answerIndex: number) => {
    if (isAnswering || !timerActive || player.answered || feedback !== null) return
    setIsAnswering(true)
    setTimerActive(false)

    try {
      const question = QUESTIONS[player.currentQuestionIndex]
      const correct = question ? answerIndex === question.correctAnswerIndex : false
      await onAnswer(player.currentQuestionIndex, answerIndex)
      if (!correct) playLoseMoneySound()
      setLastAnswerCorrect(correct)
      setFeedback({ correct, message: correct ? `Correct! +100 coins` : `Wrong! -50 coins` })
    } catch (error) {
      console.error("Error submitting answer:", error)
      setLastAnswerCorrect(false)
      setFeedback({ correct: false, message: "Error submitting answer." })
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
      if (wasCorrect && result.dieRoll !== null) {
        onDiceRoll?.(result.dieRoll, true, result.dieRolls)
        setTimeout(() => {
          onDiceRoll?.(result.dieRoll, false, result.dieRolls)
          setTimeout(() => { onDiceRoll?.(null, false); setFeedback(null); setTimerActive(true); setIsLocked(false) }, 1000)
        }, 700)
      } else {
        onDiceRoll?.(null, false)
        setFeedback(null)
        setTimerActive(true)
        setIsLocked(false)
      }
    } catch (error) {
      console.error("Error advancing:", error)
      onDiceRoll?.(null, false)
      setIsLocked(false)
    }
  }

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

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Loading question...</p>
      </div>
    )
  }

  // Monopoly-inspired button colors
  const buttonStyles = [
    "from-red-500 to-red-600 border-red-700 shadow-red-500/30",
    "from-sky-500 to-sky-600 border-sky-700 shadow-sky-500/30",
    "from-amber-500 to-amber-600 border-amber-700 shadow-amber-500/30",
    "from-green-500 to-green-600 border-green-700 shadow-green-500/30",
  ]

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
          <h2 className="text-xl font-bold text-gray-800 leading-relaxed">{currentQuestion.question}</h2>
        </div>
        <div className="flex-shrink-0">
          <CountdownTimer
            initialSeconds={20}
            onTimeExpired={handleTimeExpired}
            isActive={timerActive && !player.answered}
          />
        </div>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelectAnswer(index)}
            disabled={isAnswering || !timerActive || player.answered || feedback !== null || isLocked}
            className={`
              relative rounded-xl p-4
              bg-gradient-to-b ${buttonStyles[index]}
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

      {/* Feedback */}
      {feedback && (
        <div
          className={`
            p-4 rounded-xl text-center font-bold border-2 shadow-sm
            ${feedback.correct
              ? "bg-green-50 border-green-400 text-green-700"
              : "bg-red-50 border-red-400 text-red-700"
            }
          `}
        >
          <span className="mr-2">{feedback.correct ? "✅" : "❌"}</span>
          {feedback.message}
          {!feedback.correct && isLocked && <span className="ml-2 opacity-60 text-xs">(locked for 2s)</span>}
        </div>
      )}
    </div>
  )
}
