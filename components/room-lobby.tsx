"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Player } from "@/lib/types"
import type { RoomState } from "@/lib/p2p-types"

interface RoomLobbyProps {
  roomState: RoomState
  myPlayer: Player | null
  onCreateRoom: (hostName: string) => void
  onJoinRoom: (roomCode: string, playerName: string) => void
  onStartGame: () => void
  onLeaveRoom: () => void
}

type LobbyMode = "menu" | "create" | "join" | "waiting"

export function RoomLobby({
  roomState,
  myPlayer,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
}: RoomLobbyProps) {
  const [mode, setMode] = useState<LobbyMode>("menu")
  const [playerName, setPlayerName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      onCreateRoom(playerName.trim())
      setMode("waiting")
    } catch (err) {
      setError("Failed to create room")
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim() || !roomCode.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim())
      setMode("waiting")
    } catch (err) {
      setError("Failed to join room")
    } finally {
      setIsLoading(false)
    }
  }

  // Show waiting room if connected
  if (roomState.connectionState === "connected" && (mode === "waiting" || roomState.players.length > 0)) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute top-1/3 right-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-10 left-1/3 w-80 h-80 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-full py-8 px-4">
          <div className="w-full max-w-md">
            <div className="backdrop-blur-xl bg-white/5 border-2 border-purple-500/30 rounded-3xl p-8 shadow-2xl">
              {/* Room Code Display */}
              <div className="text-center mb-8">
                <div className="text-4xl mb-4">🎮</div>
                <h1 className="text-3xl font-black mb-2">
                  <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
                    Game Lobby
                  </span>
                </h1>

                <div className="mt-4 p-4 bg-purple-900/50 rounded-xl border border-purple-500/30">
                  <p className="text-sm text-purple-300 mb-2">Room Code</p>
                  <p className="text-4xl font-mono font-black text-cyan-400 tracking-widest">
                    {roomState.roomCode}
                  </p>
                  <p className="text-xs text-purple-400 mt-2">Share this code with friends!</p>
                </div>
              </div>

              {/* Players List */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span>👥</span> Players ({roomState.players.length})
                </h2>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {roomState.players.map((player, index) => (
                    <div
                      key={player.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-xl
                        ${player.id === myPlayer?.id ? "bg-cyan-500/20 border border-cyan-500/50" : "bg-purple-900/30"}
                      `}
                    >
                      <span className="text-2xl">{["🔴", "🔵", "🟢", "🟡", "🟣", "🩷", "🟠", "🩵"][index % 8]}</span>
                      <span className="font-semibold text-white flex-1">{player.name}</span>
                      {index === 0 && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                          👑 Host
                        </span>
                      )}
                      {player.id === myPlayer?.id && (
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">You</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="text-center mb-6">
                {roomState.role === "host" ? (
                  <p className="text-purple-300 text-sm">
                    Waiting for players to join... Start when ready!
                  </p>
                ) : (
                  <p className="text-purple-300 text-sm flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Waiting for host to start the game...
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {roomState.role === "host" && (
                  <Button
                    onClick={onStartGame}
                    disabled={roomState.players.length < 1}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-green-500/30 hover:scale-[1.02]"
                  >
                    🚀 Start Game
                  </Button>
                )}

                <Button
                  onClick={onLeaveRoom}
                  variant="outline"
                  className="w-full h-12 text-sm font-semibold border-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 rounded-xl transition-all bg-transparent"
                >
                  Leave Room
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (roomState.connectionState === "error") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/5 border-2 border-red-500/30 rounded-3xl p-8 shadow-2xl max-w-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-red-300 mb-6">{error || "Failed to connect. Please try again."}</p>
          <Button
            onClick={() => {
              setMode("menu")
              setError(null)
              onLeaveRoom()
            }}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
          >
            Back to Menu
          </Button>
        </div>
      </div>
    )
  }

  // Show connecting state
  if (roomState.connectionState === "connecting") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-purple-300 text-lg">Connecting...</p>
        </div>
      </div>
    )
  }

  // Main menu
  if (mode === "menu") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute top-1/3 right-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-10 left-1/3 w-80 h-80 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          />

          {/* Floating emojis */}
          {["🎲", "🪙", "🎯", "🎮", "🏆", "✨", "🎉", "💫"].map((emoji, i) => (
            <div
              key={i}
              className="absolute text-3xl animate-float opacity-40"
              style={{
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${3 + (i % 2)}s`,
              }}
            >
              {emoji}
            </div>
          ))}
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-full py-8 px-4">
          <div className="w-full max-w-md">
            <div className="backdrop-blur-xl bg-white/5 border-2 border-purple-500/30 rounded-3xl p-8 shadow-2xl">
              {/* Title */}
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🎲</div>
                <h1 className="text-5xl font-black mb-2">
                  <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
                    Way of Life
                  </span>
                </h1>
                <p className="text-lg text-cyan-300 font-semibold">Answer. Move. Survive. Thrive.</p>
              </div>

              {/* Menu Options */}
              <div className="space-y-4">
                <Button
                  onClick={() => setMode("create")}
                  className="w-full h-16 text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-pink-500/30 hover:scale-[1.02]"
                >
                  🏠 Create Room
                </Button>

                <Button
                  onClick={() => setMode("join")}
                  className="w-full h-16 text-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-cyan-500/30 hover:scale-[1.02]"
                >
                  🚪 Join Room
                </Button>
              </div>

              {/* How to play */}
              <div className="mt-8 pt-6 border-t border-purple-500/30">
                <h2 className="font-bold text-yellow-400 text-sm mb-3 flex items-center gap-2">
                  <span>📖</span> How to Play
                </h2>
                <ul className="space-y-2 text-sm text-purple-200">
                  <li className="flex items-start gap-2">
                    <span className="text-pink-400">🎯</span>
                    <span>
                      Answer <strong className="text-cyan-300">20 questions</strong> to move around the board
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">⏱️</span>
                    <span>
                      <strong className="text-yellow-300">20 seconds</strong> per question
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">💰</span>
                    <span>
                      <strong className="text-green-400">+100</strong> correct,{" "}
                      <strong className="text-red-400">-50</strong> wrong
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">🎲</span>
                    <span>
                      Land on tiles for <strong className="text-pink-300">wild events!</strong>
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6">
              <p className="text-purple-400 text-sm">✨ P2P Multiplayer - No server needed! ✨</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Create room form
  if (mode === "create") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute top-1/3 right-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-full py-8 px-4">
          <div className="w-full max-w-md">
            <div className="backdrop-blur-xl bg-white/5 border-2 border-purple-500/30 rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🏠</div>
                <h2 className="text-3xl font-black text-white">Create Room</h2>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-purple-300 mb-2">Your Name</label>
                  <Input
                    type="text"
                    placeholder="Enter your name..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={isLoading}
                    className="text-center text-lg h-14 bg-purple-900/50 border-2 border-purple-500/50 text-white placeholder:text-purple-400 focus:border-pink-500 focus:ring-pink-500 rounded-xl"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !playerName.trim()}
                  className="w-full h-14 text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl transition-all duration-200 shadow-lg"
                >
                  {isLoading ? "Creating..." : "Create Room"}
                </Button>

                <Button
                  type="button"
                  onClick={() => setMode("menu")}
                  variant="outline"
                  className="w-full h-12 border-2 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 rounded-xl bg-transparent"
                >
                  ← Back
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Join room form
  if (mode === "join") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute top-1/3 right-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-full py-8 px-4">
          <div className="w-full max-w-md">
            <div className="backdrop-blur-xl bg-white/5 border-2 border-purple-500/30 rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🚪</div>
                <h2 className="text-3xl font-black text-white">Join Room</h2>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-purple-300 mb-2">Room Code</label>
                  <Input
                    type="text"
                    placeholder="Enter 6-digit code..."
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                    disabled={isLoading}
                    className="text-center text-2xl font-mono font-bold tracking-widest h-16 bg-purple-900/50 border-2 border-purple-500/50 text-cyan-400 placeholder:text-purple-400 focus:border-cyan-500 focus:ring-cyan-500 rounded-xl uppercase"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-purple-300 mb-2">Your Name</label>
                  <Input
                    type="text"
                    placeholder="Enter your name..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={isLoading}
                    className="text-center text-lg h-14 bg-purple-900/50 border-2 border-purple-500/50 text-white placeholder:text-purple-400 focus:border-pink-500 focus:ring-pink-500 rounded-xl"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm text-center">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !playerName.trim() || roomCode.length !== 6}
                  className="w-full h-14 text-lg font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 shadow-lg"
                >
                  {isLoading ? "Joining..." : "Join Room"}
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setMode("menu")
                    setError(null)
                  }}
                  variant="outline"
                  className="w-full h-12 border-2 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 rounded-xl bg-transparent"
                >
                  ← Back
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
