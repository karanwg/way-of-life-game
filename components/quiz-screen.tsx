"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { CountdownTimer } from "./countdown-timer"
import { QUESTIONS } from "@/lib/questions"
import type { Player } from "@/lib/types"

interface QuizScreenProps {
  player: Player
  onAnswer: (questionIndex: number, answerIndex: number) => Promise<void>
  onNextQuestion: () => Promise<void>
}

export function QuizScreen({ player, onAnswer, onNextQuestion }: QuizScreenProps) {
  const [isAnswering, setIsAnswering] = useState(false)
  const [feedback, setFeedback] = useState<{
    correct: boolean
    message: string
  } | null>(null)
  const [timerActive, setTimerActive] = useState(true)
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
        message: data.correct
          ? `Correct! +100 coins (Total: ${data.newCoins})`
          : `Incorrect! -50 coins (Total: ${data.newCoins})`,
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
      await onNextQuestion()
      setFeedback(null)
      setTimerActive(true)
    } catch (error) {
      console.error("Error advancing to next question:", error)
    }
  }

  if (isQuizComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Quiz Complete!</h1>
          <p className="text-xl text-muted-foreground">
            Final Score: <span className="text-primary font-bold">{player.coins}</span> coins
          </p>
          <Button onClick={() => window.location.reload()} size="lg">
            Play Again
          </Button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading question...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Question Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Question {player.currentQuestionIndex + 1} of {QUESTIONS.length}
          </span>
          <span className="text-sm font-bold text-primary">{player.coins} coins</span>
        </div>
        <div className="w-full bg-secondary/20 rounded-full h-1.5">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{
              width: `${((player.currentQuestionIndex + 1) / QUESTIONS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question Text */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground text-pretty">{currentQuestion.question}</h2>

        {/* Timer */}
        <div className="flex justify-center">
          <CountdownTimer
            initialSeconds={20}
            onTimeExpired={handleTimeExpired}
            isActive={timerActive && !player.answered}
          />
        </div>
      </div>

      {/* Answer Options */}
      <div className="grid gap-3">
        {currentQuestion.options.map((option, index) => (
          <Button
            key={index}
            onClick={() => handleSelectAnswer(index)}
            disabled={isAnswering || !timerActive || player.answered || feedback !== null}
            variant="outline"
            className="h-auto p-4 text-left justify-start text-base"
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold mr-3 flex-shrink-0">
              {String.fromCharCode(65 + index)}
            </span>
            <span className="flex-1">{option}</span>
          </Button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-lg border transition-all ${
            feedback.correct
              ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400"
              : "bg-destructive/10 border-destructive/30 text-destructive dark:text-red-400"
          }`}
        >
          <p className="font-semibold">{feedback.message}</p>
        </div>
      )}
    </div>
  )
}
